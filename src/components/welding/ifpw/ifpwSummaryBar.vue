<script setup lang="ts">
// components/IfpwSummaryBar.vue
import type { IfpwStockSummary } from '@/types/Public/Welding/ifpwStock';

defineProps<{ summary: IfpwStockSummary; loading: boolean }>();

function fmt(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    <div class="bg-white border border-gray-200 rounded shadow-sm p-4 col-span-2 sm:col-span-1 lg:col-span-1">
      <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Part</p>
      <p class="text-2xl font-black text-gray-800">{{ summary.total_parts.toLocaleString('id-ID') }}</p>
      <p class="text-xs text-gray-400 mt-0.5">part welding</p>
    </div>

    <div class="bg-white border border-gray-200 rounded shadow-sm p-4">
      <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Stok</p>
      <p class="text-2xl font-black text-gray-700">{{ summary.total_stock.toLocaleString('id-ID') }}</p>
      <p class="text-xs text-gray-400 mt-0.5">pcs IFPW</p>
    </div>

    <div
      class="bg-red-50 border border-red-200 rounded shadow-sm p-4"
      :class="{ 'ring-2 ring-red-400 ring-offset-1': summary.critical_count > 0 }"
    >
      <p class="text-xs text-red-500 uppercase tracking-wider font-semibold mb-1">Kritis</p>
      <p class="text-2xl font-black text-red-700">{{ summary.critical_count }}</p>
      <p class="text-xs text-red-400 mt-0.5">≤ min stock</p>
    </div>

    <div class="bg-orange-50 border border-orange-200 rounded shadow-sm p-4">
      <p class="text-xs text-orange-500 uppercase tracking-wider font-semibold mb-1">Rendah</p>
      <p class="text-2xl font-black text-orange-700">{{ summary.low_count }}</p>
      <p class="text-xs text-orange-400 mt-0.5">≤ min × 1.5</p>
    </div>

    <div class="bg-green-50 border border-green-200 rounded shadow-sm p-4">
      <p class="text-xs text-green-600 uppercase tracking-wider font-semibold mb-1">Normal</p>
      <p class="text-2xl font-black text-green-700">{{ summary.normal_count }}</p>
      <p class="text-xs text-green-400 mt-0.5">dalam range</p>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded shadow-sm p-4">
      <p class="text-xs text-blue-500 uppercase tracking-wider font-semibold mb-1">Overstock</p>
      <p class="text-2xl font-black text-blue-700">{{ summary.overstock_count }}</p>
      <p class="text-xs text-blue-400 mt-0.5">≥ max stock</p>
    </div>
  </div>
  <p class="text-xs text-gray-400 text-right -mt-1">
    Diperbarui: <span class="font-mono">{{ fmt(summary.last_updated) }}</span>
  </p>
</template>
