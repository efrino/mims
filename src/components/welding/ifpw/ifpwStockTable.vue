<script setup lang="ts">
// components/IfpwStockTable.vue
import type { IfpwStockItem } from '@/types/Public/Welding/ifpwStock';
import { STOCK_STATUS_CONFIG } from '@/types/Public/Welding/ifpwStock';
import { ref } from 'vue';

defineProps<{ items: IfpwStockItem[]; loading: boolean; meta: { total: number; page: number; per_page: number; pages: number } }>();
const emit = defineEmits<{ pageChange: [number]; editRow: [IfpwStockItem] }>();

function fmt(ts: string) {
  return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16 bg-gray-50">
      <div class="flex items-center gap-2 text-gray-400 text-sm">
        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Memuat data stok...
      </div>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="bg-gray-100 border-b border-gray-200">
          <tr>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Part Number</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Job Number</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider hidden md:table-cell">Deskripsi</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider">Status</th>
            <th class="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">Stok</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider w-28">Level</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider">Min</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider">Max</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider hidden lg:table-cell">Updated</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider w-14">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="items.length === 0">
            <td colspan="10" class="py-12 text-center text-gray-400">Tidak ada data</td>
          </tr>
          <tr
            v-for="row in items"
            :key="row.id"
            :class="['transition-colors', row.status === 'CRITICAL' ? 'bg-red-50/60' : 'hover:bg-gray-50']"
          >
            <!-- Part Number -->
            <td class="px-3 py-2.5">
              <span class="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-xs">
                {{ row.part_number }}
              </span>
            </td>

            <!-- Job Number -->
            <td class="px-3 py-2.5 font-mono text-gray-600">{{ row.job_number || '—' }}</td>

            <!-- Desc -->
            <td class="px-3 py-2.5 text-gray-500 max-w-[160px] truncate hidden md:table-cell" :title="row.part_desc ?? ''">
              {{ row.part_desc || '—' }}
            </td>

            <!-- Status badge -->
            <td class="px-3 py-2.5 text-center">
              <span
                :class="[
                  'px-2 py-0.5 rounded text-xs font-semibold border',
                  STOCK_STATUS_CONFIG[row.status].bg,
                  STOCK_STATUS_CONFIG[row.status].text,
                  STOCK_STATUS_CONFIG[row.status].border
                ]"
              >
                {{ STOCK_STATUS_CONFIG[row.status].label }}
              </span>
            </td>

            <!-- Stock -->
            <td class="px-3 py-2.5 text-right">
              <span
                :class="[
                  'font-mono font-black text-sm',
                  row.status === 'CRITICAL'
                    ? 'text-red-700'
                    : row.status === 'LOW'
                      ? 'text-orange-600'
                      : row.status === 'OVERSTOCK'
                        ? 'text-blue-700'
                        : 'text-gray-800'
                ]"
              >
                {{ row.stock.toLocaleString('id-ID') }}
              </span>
            </td>

            <!-- Stock bar -->
            <td class="px-3 py-2.5">
              <div v-if="row.max" class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  :class="['h-2 rounded-full transition-all duration-500', STOCK_STATUS_CONFIG[row.status].bar]"
                  :style="{ width: row.pct + '%' }"
                />
              </div>
              <div v-else class="text-gray-300 text-center">—</div>
            </td>

            <!-- Min -->
            <td class="px-3 py-2.5 text-center font-mono text-gray-500">
              {{ row.min !== null ? row.min.toLocaleString('id-ID') : '—' }}
            </td>

            <!-- Max -->
            <td class="px-3 py-2.5 text-center font-mono text-gray-500">
              {{ row.max !== null ? row.max.toLocaleString('id-ID') : '—' }}
            </td>

            <!-- Updated -->
            <td class="px-3 py-2.5 font-mono text-gray-400 hidden lg:table-cell">{{ fmt(row.updated_at) }}</td>

            <!-- Action -->
            <td class="px-3 py-2.5 text-center">
              <button
                @click="emit('editRow', row)"
                class="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && meta.pages > 1" class="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50">
      <p class="text-xs text-gray-500">
        Hal. <strong>{{ meta.page }}</strong
        >/{{ meta.pages }} — <strong>{{ meta.total }}</strong> part
      </p>
      <div class="flex gap-1">
        <button
          v-for="p in meta.pages"
          :key="p"
          @click="emit('pageChange', p)"
          :class="[
            'w-6 h-6 text-xs rounded font-mono transition-colors',
            p === meta.page ? 'bg-blue-600 text-white font-bold' : 'text-gray-500 hover:bg-gray-200'
          ]"
        >
          {{ p }}
        </button>
      </div>
    </div>
  </div>
</template>
