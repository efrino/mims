<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ReconcileRow } from '@/types/Public/Welding/stockQueue';

const props = defineProps<{ rows: ReconcileRow[]; loading: boolean }>();

const search = ref('');

const filteredRows = computed(() => {
  if (!search.value) return props.rows;
  const q = search.value.toLowerCase();
  return props.rows.filter(
    (r) => r.ach_part_number?.toLowerCase().includes(q) || r.part_number_ifpp?.toLowerCase().includes(q)
  );
});

function fmt(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2 gap-2">
      <h2 class="text-sm font-bold text-gray-700">Rincian per Part</h2>
      <input
        v-model="search"
        type="text"
        placeholder="Cari part welding / IFPP..."
        class="bg-white border border-gray-300 text-gray-700 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 w-56"
      />
    </div>

    <div class="rounded border border-gray-200 overflow-hidden bg-white shadow-sm">
      <div v-if="loading && rows.length === 0" class="flex items-center justify-center py-24 bg-gray-50">
        <div class="flex items-center gap-2 text-gray-400 text-sm">
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Memuat data...
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-100 border-b border-gray-200">
            <tr>
              <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Part Welding</th>
              <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider">Baris FAILED</th>
              <th class="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">Qty Belum Ter-refleksi</th>
              <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Part IFPP</th>
              <th class="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">Stok IFPP Now</th>
              <th class="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">Stok WIP Now</th>
              <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Gagal Pertama</th>
              <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Gagal Terakhir</th>
              <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Error Terakhir</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="filteredRows.length === 0">
              <td colspan="9" class="py-12 text-center text-gray-400">
                <template v-if="!loading">Tidak ada backlog FAILED 🎉</template>
              </td>
            </tr>
            <tr v-for="(r, i) in filteredRows" :key="r.ach_part_number + (r.part_number_ifpp ?? '') + i" class="hover:bg-gray-50">
              <td class="px-3 py-2 font-mono text-blue-700 bg-blue-50/40">{{ r.ach_part_number }}</td>
              <td class="px-3 py-2 text-center font-mono">{{ r.failed_count }}</td>
              <td class="px-3 py-2 text-right font-mono font-bold text-amber-700">
                {{ Number(r.failed_qty_sum).toLocaleString('id-ID') }}
              </td>
              <td class="px-3 py-2">
                <span v-if="!r.has_ifpp_mapping" class="text-red-600 text-xs font-semibold">Tidak ada mapping</span>
                <span v-else class="font-mono text-gray-700">{{ r.part_number_ifpp }}</span>
              </td>
              <td class="px-3 py-2 text-right font-mono">{{ r.ifpp_stock_now ?? '—' }}</td>
              <td class="px-3 py-2 text-right font-mono">{{ r.wip_stock_now ?? '—' }}</td>
              <td class="px-3 py-2 font-mono text-gray-500">{{ fmt(r.first_failed_at) }}</td>
              <td class="px-3 py-2 font-mono text-gray-500">{{ fmt(r.last_failed_at) }}</td>
              <td class="px-3 py-2 max-w-[220px]">
                <span v-if="r.last_error_msg" class="text-red-600 truncate block" :title="r.last_error_msg">
                  {{ r.last_error_msg }}
                </span>
                <span v-else class="text-gray-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
