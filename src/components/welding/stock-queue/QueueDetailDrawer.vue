<script setup lang="ts">
// components/QueueDetailDrawer.vue
import type { QueueDetail, ProcessMode } from '@/types/Public/Welding/stockQueue';
import { STATUS_CONFIG, MODE_CONFIG } from '@/types/Public/Welding/stockQueue';
import { computed } from 'vue';
import StatusBadge from './StatusBadge.vue';
import AnimatedNumber from '@/components/shared/AnimatedNumber.vue';

const props = defineProps<{ detail: QueueDetail | null; loading: boolean }>();
const emit = defineEmits<{ close: []; retry: [number] }>();

function fmt(ts: string | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' });
}
function shiftLabel(code: number | string) {
  return Number(code) === 1 ? 'Shift 1 (07:15–19:59)' : 'Shift 2 (20:00–07:14)';
}

// Normalisasi nilai category dari API ke key MODE_CONFIG (INHOUSE/OUTHOUSE/ALL)
function modeKey(value: string | null | undefined): ProcessMode | null {
  if (!value) return null;
  const up = String(value).toUpperCase();
  return up === 'INHOUSE' || up === 'OUTHOUSE' || up === 'ALL' ? (up as ProcessMode) : null;
}

const ifpwAvailable = computed(
  () => props.detail !== null && props.detail.deductions.length > 0 && props.detail.deductions.some((d) => d.ifpw_stock !== null)
);

// Total IFPP yang dikonsumsi (qty_delta × BQ per child)
const totalIfppDeducted = computed(() => props.detail?.deductions.reduce((s, d) => s + Number(d.qty_deducted), 0) ?? 0);

// Output IFPW selalu = qty_delta (bukan × BQ)
// BQ hanya berlaku untuk konsumsi komponen IFPP
const ifpwOutput = computed(() => (props.detail ? Number(props.detail.queue.qty_delta) : 0));
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-backdrop">
      <div v-if="detail || loading" class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" @click="emit('close')" />
    </Transition>

    <Transition name="drawer">
      <div
        v-if="detail || loading"
        class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col border-l border-gray-200"
        @click.stop
      >
        <!-- ── Header ──────────────────────────────────────────── -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-1 h-5 bg-blue-600 rounded-full" />
            <h2 class="font-bold text-gray-800 text-sm">Detail Queue</h2>
            <span v-if="detail" class="font-mono text-xs text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
              #{{ detail.queue.id }}
            </span>
          </div>
          <button
            @click="emit('close')"
            class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors text-base"
          >
            ✕
          </button>
        </div>

        <!-- ── Loading ─────────────────────────────────────────── -->
        <div v-if="loading" class="flex-1 flex items-center justify-center">
          <div class="flex items-center gap-2 text-gray-400 text-sm">
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Memuat detail...
          </div>
        </div>

        <template v-else-if="detail">
          <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
            <!-- ── Queue Info ─────────────────────────────────── -->
            <div class="px-5 py-4">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informasi Queue</p>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Status</p>
                  <StatusBadge :status="detail.queue.status" :pulse="detail.queue.status === 'PROCESSING'" />
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Shift</p>
                  <p class="text-xs font-semibold text-gray-700">{{ shiftLabel(detail.queue.shift_code) }}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-xs text-gray-400 mb-0.5">Diproses sebagai</p>
                  <span
                    v-if="modeKey(detail.queue.category_mode)"
                    :class="[
                      'inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border',
                      MODE_CONFIG[modeKey(detail.queue.category_mode)!].bg,
                      MODE_CONFIG[modeKey(detail.queue.category_mode)!].text,
                      MODE_CONFIG[modeKey(detail.queue.category_mode)!].border
                    ]"
                  >
                    <span class="font-mono">{{ MODE_CONFIG[modeKey(detail.queue.category_mode)!].short }}</span>
                    {{ MODE_CONFIG[modeKey(detail.queue.category_mode)!].label }}
                  </span>
                  <span v-else class="text-xs text-gray-400">— belum diproses</span>
                </div>
                <div class="col-span-2">
                  <p class="text-xs text-gray-400 mb-0.5">Part Number (Welding)</p>
                  <span class="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {{ detail.queue.ach_part_number }}
                  </span>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Line</p>
                  <p class="text-xs font-semibold text-gray-700">{{ detail.queue.ach_line_id }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Urut</p>
                  <p class="font-mono text-xs text-gray-700">{{ detail.queue.ach_urut }}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-xs text-gray-400 mb-0.5">Achievement ID</p>
                  <p class="font-mono text-xs text-gray-600 break-all">{{ detail.queue.ach_id }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Tanggal Produksi</p>
                  <p class="font-mono text-xs text-gray-700">{{ detail.queue.production_date }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Δ Qty (lotsize_actual)</p>
                  <p class="font-mono text-base font-black text-green-700">
                    {{ Number(detail.queue.qty_delta) > 0 ? '+' : '' }}<AnimatedNumber :value="Number(detail.queue.qty_delta)" /> pcs
                  </p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Created At</p>
                  <p class="font-mono text-xs text-gray-600">{{ fmt(detail.queue.created_at) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Processed At</p>
                  <p class="font-mono text-xs text-gray-600">{{ fmt(detail.queue.processed_at) }}</p>
                </div>
                <div v-if="detail.queue.retry_count > 0" class="col-span-2">
                  <p class="text-xs text-gray-400 mb-0.5">Retry Count</p>
                  <p class="text-xs font-bold text-orange-700">{{ detail.queue.retry_count }}x percobaan</p>
                </div>
                <div v-if="detail.queue.error_msg" class="col-span-2">
                  <p class="text-xs text-gray-400 mb-0.5">Error</p>
                  <p class="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 font-mono break-all">
                    {{ detail.queue.error_msg }}
                  </p>
                </div>
              </div>
              <button
                v-if="detail.queue.status === 'FAILED'"
                @click="emit('retry', detail.queue.id)"
                class="mt-3 w-full py-2 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 transition-colors"
              >
                🔁 Retry Queue Ini
              </button>
            </div>

            <!-- ── Deduction Details ──────────────────────────── -->
            <div class="px-5 py-4">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rincian Pengurangan IFPP → IFPW</p>
                <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">
                  {{ detail.deductions.length }} part IFPP
                </span>
              </div>

              <!-- Rumus header — tampilkan konsep BQ sekali di atas -->
              <div class="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <p class="font-semibold mb-1">📐 Rumus kalkulasi</p>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span class="text-blue-500">IFPP dikurangi:</span>
                    <span class="font-mono ml-1">Δ qty × BQ</span>
                  </div>
                  <div>
                    <span class="text-blue-500">IFPW ditambah:</span>
                    <span class="font-mono ml-1">Δ qty saja </span>
                  </div>
                </div>
              </div>

              <!-- Empty -->
              <div
                v-if="detail.deductions.length === 0"
                class="text-center py-8 text-gray-400 text-xs bg-gray-50 rounded border border-dashed border-gray-200"
              >
                <p class="text-2xl mb-1">📭</p>
                <p v-if="detail.queue.status === 'PENDING'">Belum diproses — deduction belum terjadi</p>
                <p v-else>Tidak ada mapping IFPP untuk part ini</p>
              </div>

              <!-- Deduction cards -->
              <div v-else class="space-y-2">
                <div v-for="(d, i) in detail.deductions" :key="i" class="border border-gray-200 rounded overflow-hidden bg-white">
                  <!-- Card header -->
                  <div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <div class="flex items-center gap-2">
                      <span
                        class="w-4 h-4 rounded-full bg-blue-100 border border-blue-300 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0"
                      >
                        {{ i + 1 }}
                      </span>
                      <span class="font-mono text-xs text-blue-700 font-semibold">{{ d.part_number_ifpp }}</span>
                      <span class="text-xs text-gray-400">{{ d.job_number_ifpp }}</span>
                      <span
                        v-if="modeKey(d.category)"
                        :class="[
                          'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border leading-none',
                          MODE_CONFIG[modeKey(d.category)!].bg,
                          MODE_CONFIG[modeKey(d.category)!].text,
                          MODE_CONFIG[modeKey(d.category)!].border
                        ]"
                        :title="MODE_CONFIG[modeKey(d.category)!].label"
                      >
                        {{ MODE_CONFIG[modeKey(d.category)!].short }}
                      </span>
                    </div>
                    <span class="text-xs font-mono text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                      BQ ×{{ d.bq }}
                    </span>
                  </div>

                  <!-- Stock flow -->
                  <div class="px-3 py-3 space-y-2">
                    <!-- IFPP row: qty = delta × BQ -->
                    <div class="flex items-center gap-2">
                      <div class="w-10 shrink-0">
                        <span class="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">IFPP</span>
                      </div>
                      <div class="flex-1 flex items-center gap-2 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5">
                        <div class="text-right min-w-[40px]">
                          <span v-if="d.stock_before !== null" class="font-mono text-xs text-gray-500">
                            <AnimatedNumber :value="d.stock_before" />
                          </span>
                          <span v-else class="text-gray-300 text-xs font-mono">?</span>
                        </div>
                        <div class="flex-1 flex items-center justify-center gap-1">
                          <!-- IFPP: delta × BQ -->
                          <span class="font-mono text-xs font-bold text-rose-600">
                            −<AnimatedNumber :value="Number(d.qty_deducted)" />
                          </span>
                          <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div class="min-w-[50px]">
                          <span class="font-mono text-xs font-black text-gray-800"><AnimatedNumber :value="d.stock_after" /></span>
                          <span class="text-gray-400 text-xs ml-0.5">pcs</span>
                        </div>
                      </div>
                    </div>

                    <!-- IFPW row: qty = delta saja (BUKAN × BQ) -->
                    <!-- Hanya tampil di card pertama karena IFPW = 1 row per welding part -->
                    <div v-if="i === 0" class="flex items-center gap-2">
                      <div class="w-10 shrink-0">
                        <span class="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">IFPW</span>
                      </div>

                      <div
                        v-if="d.ifpw_stock !== null"
                        class="flex-1 flex items-center gap-2 bg-green-50 border border-green-100 rounded px-2.5 py-1.5"
                      >
                        <div class="flex-1 flex items-center justify-center gap-1">
                          <!-- IFPW: delta SAJA, bukan × BQ -->
                          <span class="font-mono text-xs font-bold text-green-600"> +<AnimatedNumber :value="ifpwOutput" /> </span>
                          <svg class="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div class="min-w-[50px]">
                          <span class="font-mono text-xs font-black text-green-800"><AnimatedNumber :value="Number(d.ifpw_stock)" /></span>
                          <span class="text-gray-400 text-xs ml-0.5">pcs</span>
                        </div>
                      </div>

                      <div
                        v-else-if="ifpwAvailable"
                        class="flex-1 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-400 font-mono"
                      >
                        Part belum ada di IFPW — stock: 0
                      </div>

                      <div v-else class="flex-1 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 text-xs text-amber-600">
                        ⚠ Tabel IFPW belum tersedia
                      </div>
                    </div>

                    <!-- Untuk card ke-2 dst: tampilkan info bahwa IFPW shared -->
                    <div v-else class="flex items-center gap-2">
                      <div class="w-10 shrink-0">
                        <span class="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">IFPW</span>
                      </div>
                      <div class="flex-1 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-400">
                        ↑ Sama dengan di atas — 1 row IFPW per welding part
                      </div>
                    </div>
                  </div>

                  <!-- Formula footer -->
                  <div class="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                    <p class="text-xs text-gray-400 font-mono">
                      IFPP: {{ Number(detail.queue.qty_delta) }} × BQ {{ d.bq }} =
                      <strong class="text-rose-600">−<AnimatedNumber :value="Number(d.qty_deducted)" /> pcs</strong>
                      <span class="mx-1.5 text-gray-300">|</span>
                      IFPW: <strong class="text-green-600">+<AnimatedNumber :value="ifpwOutput" /> pcs</strong>
                      <span class="text-gray-400 ml-1"></span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Summary -->
              <div v-if="detail.deductions.length > 0" class="mt-3 space-y-1.5">
                <!-- Total IFPP -->
                <div class="flex items-center justify-between bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  <span class="text-xs text-rose-700 font-semibold">Total IFPP dikurangi</span>
                  <span class="font-mono text-xs font-black text-rose-800">
                    <AnimatedNumber :value="totalIfppDeducted" /> pcs
                    <span class="font-normal text-rose-500">dari {{ detail.deductions.length }} komponen</span>
                  </span>
                </div>
                <!-- Total IFPW -->
                <div class="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-2">
                  <span class="text-xs text-green-700 font-semibold">Total IFPW bertambah</span>
                  <span class="font-mono text-xs font-black text-green-800">
                    <AnimatedNumber :value="ifpwOutput" /> pcs
                    <span class="font-normal text-green-500">(= lotsize_actual)</span>
                  </span>
                </div>
              </div>

              <!-- Note kumulatif -->
              <div v-if="ifpwAvailable" class="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <span class="font-semibold">ℹ Catatan stok IFPW:</span>
                Nilai yang ditampilkan adalah <strong>stok kumulatif saat ini</strong> di tabel
                <code class="bg-blue-100 px-1 rounded font-mono">ms_rundown_ifpw_stock</code>, bukan delta per transaksi ini.
              </div>
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
