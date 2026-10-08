<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useStockQueueStore } from '@/stores/Public/Welding/stockQueueStore';
import { urlExportExcel } from '@/services/Public/Welding/stockQueueService';
import { useAnimatedNumber } from '@/composables/useAnimatedNumber';

const router = useRouter();
const store = useStockQueueStore();
const { noMoveRows, noMoveMeta, loadingNoMove, errorNoMove } = storeToRefs(store);

const hari = ref(30);
const search = ref('');

const animTotal = useAnimatedNumber(computed(() => Number(noMoveMeta.value.total_part)));
const animTanpa = useAnimatedNumber(computed(() => Number(noMoveMeta.value.tanpa_mapping)));
const animStok = useAnimatedNumber(computed(() => Number(noMoveMeta.value.total_stok)));

const rows = computed(() => {
  if (!search.value) return noMoveRows.value;
  const q = search.value.toLowerCase();
  return noMoveRows.value.filter(
    (r) =>
      r.part_number?.toLowerCase().includes(q) ||
      r.job_number?.toLowerCase().includes(q) ||
      r.daftar_welding?.toLowerCase().includes(q)
  );
});

function fmtTgl(ts: string | null) {
  if (!ts) return 'belum pernah';
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Warna baris menurut tingkat kecurigaan: tanpa mapping paling perlu dicek,
// lalu yang punya mapping tapi belum pernah bergerak sama sekali.
function nadaBaris(r: { kondisi_mapping: string; terakhir_terdeduksi: string | null }) {
  if (r.kondisi_mapping === 'TANPA mapping') return 'bg-red-50/60';
  if (!r.terakhir_terdeduksi) return 'bg-amber-50/60';
  return '';
}

onMounted(() => store.loadNoMovement(hari.value));
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-800" style="font-family: 'DM Sans', 'Segoe UI', sans-serif">
    <!-- ── Header ─────────────────────────────────────────── -->
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div class="w-full px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center justify-center w-7 h-7 rounded bg-blue-600 text-white font-black text-xs shrink-0">TP</div>
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-bold text-gray-800 text-sm whitespace-nowrap">Part IFPP Tanpa Pergerakan</span>
            <span class="text-gray-300 hidden sm:inline">|</span>
            <span class="text-xs text-gray-500 hidden sm:inline truncate">Stok Otomatis Welding</span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <a
            :href="urlExportExcel()"
            class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded px-2.5 py-1.5 hover:bg-emerald-100 transition-colors"
            title="Unduh laporan lengkap (semua sheet) dalam format Excel"
          >
            ⤓ Excel
          </a>
          <button
            @click="router.push('/welding/stock-queue')"
            class="text-xs font-semibold text-gray-500 border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
          >
            ← Antrian
          </button>
          <button
            @click="store.loadNoMovement(hari)"
            :disabled="loadingNoMove"
            class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 border border-gray-200 rounded hover:border-blue-400 transition-all disabled:opacity-40 bg-white"
            title="Segarkan"
          >
            <svg :class="['w-3.5 h-3.5', loadingNoMove ? 'animate-spin' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="w-full px-4 sm:px-6 py-5 space-y-4">
      <!-- ── Penjelasan ─────────────────────────────────────── -->
      <div class="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-lg shrink-0">ⓘ</div>
        <div class="text-sm text-blue-900 leading-relaxed">
          <p class="font-semibold">Part IFPP yang punya stok tapi stoknya tidak pernah berkurang dalam {{ noMoveMeta.hari }} hari terakhir.</p>
          <p class="text-blue-700 mt-0.5 text-xs">
            Biasanya karena mapping ke part welding belum ada atau salah arah — tapi
            <span class="font-semibold">tidak selalu</span>: part dengan routing SINGLE memang tidak dikonsumsi
            lewat welding sehingga wajar diam. Kolom <span class="font-semibold">Dugaan</span> memberi arah
            pemeriksaan, tetap perlu dicek orang yang paham partnya.
          </p>
        </div>
      </div>

      <div v-if="errorNoMove" class="flex items-center gap-2 bg-red-50 border border-red-300 rounded px-3 py-2.5 text-sm text-red-700">
        <span>⚠</span> {{ errorNoMove }}
      </div>

      <!-- ── Ringkasan + kontrol ────────────────────────────── -->
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="flex gap-3">
          <div class="bg-white rounded border border-gray-200 shadow-sm px-4 py-2">
            <div class="text-gray-400 text-xs">Part terdampak</div>
            <div class="text-xl font-black tabular-nums">{{ animTotal.toLocaleString('id-ID') }}</div>
          </div>
          <div class="bg-white rounded border border-red-200 shadow-sm px-4 py-2">
            <div class="text-gray-400 text-xs">Belum ada mapping</div>
            <div class="text-xl font-black text-red-700 tabular-nums">{{ animTanpa.toLocaleString('id-ID') }}</div>
          </div>
          <div class="bg-white rounded border border-gray-200 shadow-sm px-4 py-2">
            <div class="text-gray-400 text-xs">Total stok diam</div>
            <div class="text-xl font-black text-amber-700 tabular-nums">{{ animStok.toLocaleString('id-ID') }}</div>
          </div>
        </div>

        <div class="flex items-end gap-2">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Rentang</label>
            <select
              v-model.number="hari"
              @change="store.loadNoMovement(hari)"
              class="bg-white border border-gray-300 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option :value="7">7 hari</option>
              <option :value="14">14 hari</option>
              <option :value="30">30 hari</option>
              <option :value="60">60 hari</option>
              <option :value="90">90 hari</option>
            </select>
          </div>
          <input
            v-model="search"
            type="text"
            placeholder="Cari part / job / welding..."
            class="bg-white border border-gray-300 text-sm rounded px-2 py-1.5 w-56 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      <!-- ── Tabel ──────────────────────────────────────────── -->
      <div class="rounded border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div v-if="loadingNoMove && noMoveRows.length === 0" class="flex items-center justify-center py-24 bg-gray-50">
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
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Part IFPP</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Job</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Routing</th>
                <th class="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">Stok</th>
                <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider">Status</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Mapping</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Welding</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Terakhir bergerak</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Dugaan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="rows.length === 0">
                <td colspan="9" class="py-12 text-center text-gray-400">
                  <template v-if="!loadingNoMove">Semua part IFPP berstok punya pergerakan 🎉</template>
                </td>
              </tr>
              <tr v-for="r in rows" :key="r.part_number" :class="['hover:bg-gray-50', nadaBaris(r)]">
                <td class="px-3 py-2 font-mono font-semibold text-blue-700">{{ r.part_number }}</td>
                <td class="px-3 py-2 font-mono text-gray-600">{{ r.job_number || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ r.routing || '—' }}</td>
                <td class="px-3 py-2 text-right font-mono font-bold tabular-nums">
                  {{ Number(r.stock).toLocaleString('id-ID') }}
                </td>
                <td class="px-3 py-2 text-center">
                  <span
                    :class="[
                      'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                      r.status === 'OVER'
                        ? 'text-amber-700 bg-amber-50 border-amber-300'
                        : r.status === 'KRITIS'
                          ? 'text-red-700 bg-red-50 border-red-300'
                          : 'text-green-700 bg-green-50 border-green-300'
                    ]"
                  >
                    {{ r.status }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <span
                    :class="r.kondisi_mapping === 'TANPA mapping' ? 'text-red-600 font-semibold' : 'text-gray-600'"
                  >
                    {{ r.kondisi_mapping }}
                  </span>
                </td>
                <td class="px-3 py-2 font-mono text-gray-600 max-w-[170px] truncate" :title="r.daftar_welding || ''">
                  {{ r.daftar_welding || '—' }}
                </td>
                <td class="px-3 py-2 font-mono" :class="r.terakhir_terdeduksi ? 'text-gray-600' : 'text-amber-700 font-semibold'">
                  {{ fmtTgl(r.terakhir_terdeduksi) }}
                </td>
                <td class="px-3 py-2 text-gray-600 max-w-[300px]">{{ r.dugaan }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="text-xs text-gray-400">
        Baris merah = belum ada mapping sama sekali · baris kuning = mapping ada tapi belum pernah terdeduksi.
      </p>
    </main>
  </div>
</template>
