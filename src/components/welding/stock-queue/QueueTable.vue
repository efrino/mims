<script setup lang="ts">
import { computed } from 'vue';
import type { QueueItem, QueueListMeta } from '@/types/Public/Welding/stockQueue';
import { MODE_CONFIG } from '@/types/Public/Welding/stockQueue';
import { useAnimatedNumber } from '@/composables/useAnimatedNumber';
import StatusBadge from './StatusBadge.vue';

const props = defineProps<{ items: QueueItem[]; meta: QueueListMeta; loading: boolean }>();
const emit = defineEmits<{ pageChange: [number]; retryRow: [number]; selectRow: [QueueItem] }>();

// Total baris dianimasikan (count-up/down) untuk tampilan saja - page/pages
// TIDAK dianimasikan karena dipakai langsung utk logika paginasi (harus exact).
const animatedTotal = useAnimatedNumber(computed(() => Number(props.meta.total)));

// Paginasi berjendela: maksimal 7 nomor halaman di sekitar halaman aktif.
const pageWindow = computed<number[]>(() => {
  const { page, pages } = props.meta;
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const win = new Set<number>([1, pages, page, page - 1, page + 1, page - 2, page + 2]);
  return [...win].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
});

// ── Keterangan ────────────────────────────────────────────────────────────
// Sejak perbaikan Agustus 2026, baris berstatus DONE pun bisa membawa pesan
// (mis. "tidak punya mapping", "Deduksi SEBAGIAN", "Delta = 0"). Semuanya
// dulu dirender merah sehingga catatan biasa terlihat seperti kegagalan.
// Di sini pesan diringkas jadi label pendek (teks penuh tetap ada di tooltip)
// dan diberi warna sesuai tingkat kepentingannya.
type Ket = { label: string; warna: string };

function keterangan(row: QueueItem): Ket | null {
  const msg = row.error_msg;
  if (!msg) return null;

  if (msg.startsWith('Deduksi SEBAGIAN')) {
    return { label: 'Sebagian — ada mapping rusak', warna: 'text-amber-700' };
  }
  if (msg.includes('tidak punya mapping IFPP sama sekali')) {
    return { label: 'Tanpa mapping IFPP', warna: 'text-gray-500' };
  }
  if (msg.startsWith('Delta = 0')) {
    return { label: 'Delta 0 — saling cancel', warna: 'text-gray-500' };
  }
  if (msg.includes('tidak sinkron')) {
    return { label: 'Mapping tidak sinkron', warna: 'text-red-600' };
  }
  if (msg.startsWith('Mode tidak cocok')) {
    return { label: 'Mode tidak cocok', warna: 'text-red-600' };
  }
  if (msg.startsWith('Skipped:')) {
    return { label: msg.replace(/^Skipped:\s*/, ''), warna: 'text-gray-500' };
  }
  // Pesan tak dikenal: tampilkan apa adanya, merah hanya bila memang gagal.
  return { label: msg, warna: row.status === 'FAILED' ? 'text-red-600' : 'text-gray-500' };
}

function formatDateTime(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
function shiftLabel(code: number | string) {
  return Number(code) === 1 ? 'Pagi' : 'Malam';
}
function shiftClass(code: number | string) {
  return Number(code) === 1
    ? 'text-orange-700 bg-orange-100 border border-orange-300'
    : 'text-indigo-700 bg-indigo-100 border border-indigo-300';
}
</script>

<template>
  <div class="rounded border border-gray-200 overflow-hidden bg-white shadow-sm">
    <!-- Loading (hanya saat pertama kali, sebelum ada data) -->
    <div v-if="loading && items.length === 0" class="flex items-center justify-center py-24 bg-gray-50">
      <div class="flex items-center gap-2 text-gray-400 text-sm">
        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Memuat data...
      </div>
    </div>

    <!-- Table (tetap tampil saat refresh — tidak flicker) -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs">
        <!-- Header -->
        <thead class="bg-gray-100 border-b border-gray-200">
          <tr>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider w-10">ID</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Sumber Produksi</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Part Number</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Line</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider w-12">Shift</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Tgl Produksi</th>
            <th class="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">Qty Hasil</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider">Status</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider w-14">Coba Ulang</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Diproses</th>
            <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Keterangan</th>
            <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider w-16">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="items.length === 0">
            <td colspan="12" class="py-12 text-center text-gray-400">Tidak ada data ditemukan</td>
          </tr>
          <tr
            v-for="row in items"
            :key="row.id"
            @click="emit('selectRow', row)"
            class="hover:bg-blue-50 cursor-pointer transition-colors group"
          >
            <td class="px-3 py-2 font-mono text-gray-400">{{ row.id }}</td>
            <td class="px-3 py-2">
              <div class="font-mono text-gray-700 max-w-[140px] truncate" :title="row.ach_id">{{ row.ach_id }}</div>
              <div class="text-gray-400 mt-0.5">urut: {{ row.ach_urut }}</div>
            </td>
            <td class="px-3 py-2">
              <span class="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                {{ row.ach_part_number }}
              </span>
            </td>
            <td class="px-3 py-2 text-gray-600 max-w-[100px] truncate" :title="row.ach_line_id">{{ row.ach_line_id }}</td>
            <td class="px-3 py-2 text-center">
              <span :class="['text-xs font-bold font-mono px-1.5 py-0.5 rounded', shiftClass(row.shift_code)]">
                {{ shiftLabel(row.shift_code) }}
              </span>
            </td>
            <td class="px-3 py-2 font-mono text-gray-600">{{ row.production_date }}</td>
            <td class="px-3 py-2 text-right">
              <span class="font-mono font-bold text-green-700">+{{ Number(row.qty_delta).toLocaleString('id-ID') }}</span>
            </td>
            <td class="px-3 py-2 text-center">
              <div class="flex flex-col items-center gap-1">
                <StatusBadge :status="row.status" :pulse="row.status === 'PROCESSING'" />
                <span
                  v-if="row.category_mode"
                  :class="[
                    'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border leading-none',
                    MODE_CONFIG[row.category_mode].bg,
                    MODE_CONFIG[row.category_mode].text,
                    MODE_CONFIG[row.category_mode].border
                  ]"
                  :title="'Diproses sebagai: ' + MODE_CONFIG[row.category_mode].label"
                >
                  {{ MODE_CONFIG[row.category_mode].short }}
                </span>
              </div>
            </td>
            <td class="px-3 py-2 text-center">
              <span :class="['font-mono px-1.5 py-0.5 rounded', row.retry_count > 0 ? 'text-orange-700 bg-orange-100' : 'text-gray-400']">
                {{ row.retry_count }}x
              </span>
            </td>
            <td class="px-3 py-2 font-mono text-gray-500">{{ formatDateTime(row.processed_at) }}</td>
            <td class="px-3 py-2 max-w-[190px]">
              <span
                v-if="keterangan(row)"
                :class="['truncate block', keterangan(row)!.warna]"
                :title="row.error_msg!"
              >
                {{ keterangan(row)!.label }}
              </span>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-3 py-2 text-center" @click.stop>
              <button
                v-if="row.status === 'FAILED'"
                @click="emit('retryRow', row.id)"
                class="px-2 py-1 text-xs text-amber-700 border border-amber-300 bg-amber-50 rounded hover:bg-amber-100 transition-colors"
              >
                Retry
              </button>
              <!-- Detail hint -->
              <span v-else class="text-gray-300 group-hover:text-blue-400 transition-colors text-base">›</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination (berjendela) -->
    <div v-if="meta.pages > 1" class="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50">
      <p class="text-xs text-gray-500">
        Hal. <strong>{{ meta.page }}</strong
        >/{{ meta.pages }} — total <strong>{{ animatedTotal.toLocaleString('id-ID') }}</strong> baris
      </p>
      <div class="flex items-center gap-1">
        <button
          @click="emit('pageChange', meta.page - 1)"
          :disabled="meta.page <= 1"
          class="px-2 h-6 text-xs rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          ‹
        </button>
        <template v-for="(p, i) in pageWindow" :key="p">
          <span v-if="i > 0 && p - pageWindow[i - 1] > 1" class="text-gray-300 px-0.5">…</span>
          <button
            @click="emit('pageChange', p)"
            :class="[
              'min-w-[1.5rem] h-6 px-1 text-xs rounded font-mono transition-colors',
              p === meta.page ? 'bg-blue-600 text-white font-bold' : 'text-gray-500 hover:bg-gray-200'
            ]"
          >
            {{ p }}
          </button>
        </template>
        <button
          @click="emit('pageChange', meta.page + 1)"
          :disabled="meta.page >= meta.pages"
          class="px-2 h-6 text-xs rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>
