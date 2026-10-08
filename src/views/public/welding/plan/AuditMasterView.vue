<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useStockQueueStore } from '@/stores/Public/Welding/stockQueueStore';
import { useAnimatedNumber } from '@/composables/useAnimatedNumber';
import { urlExportAuditMaster } from '@/services/Public/Welding/stockQueueService';
import ToastNotif from '@/components/welding/stock-queue/ToastNotif.vue';

const router = useRouter();
const store = useStockQueueStore();
const {
  auditRows,
  auditMeta,
  loadingAudit,
  errorAudit,
  uploadingMaster,
  actionMessage,
  actionSuccess
} = storeToRefs(store);

const hari = ref(30);
const fSource = ref('');
const fStatus = ref('');
const search = ref('');

const fileInput = ref<HTMLInputElement | null>(null);
const uploadSource = ref<'INHOUSE' | 'OUTHOUSE'>('OUTHOUSE');

const animTotal = useAnimatedNumber(computed(() => Number(auditMeta.value.total_diaudit)));
const animSingle = useAnimatedNumber(computed(() => Number(auditMeta.value.dikecualikan?.routing_SINGLE ?? 0)));
const animOk = useAnimatedNumber(computed(() => Number(auditMeta.value.per_status?.['OK'] ?? 0)));

const temuan = computed(() =>
  Object.entries(auditMeta.value.per_status ?? {}).filter(([k]) => k !== 'OK')
);
const animTemuan = useAnimatedNumber(computed(() => temuan.value.reduce((a, [, n]) => a + Number(n), 0)));

const rows = computed(() => {
  if (!search.value) return auditRows.value;
  const q = search.value.toLowerCase();
  return auditRows.value.filter(
    (r) =>
      r.part_number?.toLowerCase().includes(q) ||
      r.job_number?.toLowerCase().includes(q) ||
      r.daftar_welding?.toLowerCase().includes(q) ||
      r.customer?.toLowerCase().includes(q)
  );
});

// Urutan keparahan: makin merah makin perlu ditindak.
const NADA: Record<string, string> = {
  'MAPPING RUSAK TOTAL': 'text-red-700 bg-red-50 border-red-300',
  'TANPA MAPPING': 'text-red-700 bg-red-50 border-red-300',
  'TIDAK ADA DI RUNDOWN': 'text-orange-700 bg-orange-50 border-orange-300',
  'BELUM PERNAH TERDEDUKSI': 'text-amber-700 bg-amber-50 border-amber-300',
  MANDEK: 'text-amber-700 bg-amber-50 border-amber-300',
  'MAPPING RUSAK SEBAGIAN': 'text-yellow-700 bg-yellow-50 border-yellow-300',
  OK: 'text-green-700 bg-green-50 border-green-300'
};
function nada(s: string) {
  return NADA[s] ?? 'text-gray-600 bg-gray-50 border-gray-300';
}
function nadaBaris(s: string) {
  if (s === 'TANPA MAPPING' || s === 'MAPPING RUSAK TOTAL') return 'bg-red-50/50';
  if (s === 'TIDAK ADA DI RUNDOWN') return 'bg-orange-50/50';
  if (s === 'MANDEK' || s === 'BELUM PERNAH TERDEDUKSI') return 'bg-amber-50/40';
  return '';
}

function fmtTgl(ts: string | null) {
  if (!ts) return 'belum pernah';
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Sheet Outhouse pernah ketinggalan >2 bulan — tandai supaya tidak dipercaya diam-diam.
function umurHari(ts: string | null) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
}

function muat() {
  store.loadAuditMaster({
    hari: hari.value,
    source: fSource.value || undefined,
    status: fStatus.value || undefined
  });
}

// Unduhan mengikuti filter yang sedang tampil, jadi isi file = isi layar.
const urlUnduh = computed(() =>
  urlExportAuditMaster({
    hari: hari.value,
    source: fSource.value || undefined,
    status: fStatus.value || undefined
  })
);

function pilihBerkas() {
  fileInput.value?.click();
}

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const ok = await store.importMaster(f, uploadSource.value);
  (e.target as HTMLInputElement).value = '';
  if (ok) muat();
}

onMounted(() => muat());
</script>

<template>
  <div class="min-h-screen bg-gray-100 text-gray-800" style="font-family: 'DM Sans', 'Segoe UI', sans-serif">
    <!-- ── Header ─────────────────────────────────────────── -->
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div class="w-full px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center justify-center w-7 h-7 rounded bg-blue-600 text-white font-black text-xs shrink-0">TP</div>
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-bold text-gray-800 text-sm whitespace-nowrap">Audit Pengurang vs Master IFPP</span>
            <span class="text-gray-300 hidden sm:inline">|</span>
            <span class="text-xs text-gray-500 hidden md:inline truncate">Stok Otomatis Welding</span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <select
            v-model="uploadSource"
            class="text-xs bg-white border border-gray-300 rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            title="Workbook mana yang akan diunggah"
          >
            <option value="INHOUSE">Inhouse</option>
            <option value="OUTHOUSE">Outhouse</option>
          </select>
          <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFile" />
          <button
            @click="pilihBerkas"
            :disabled="uploadingMaster"
            class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded px-2.5 py-1.5 hover:bg-emerald-100 transition-colors disabled:opacity-40"
            title="Unggah Master IFPP .xlsx dari tim Rundown"
          >
            {{ uploadingMaster ? 'Mengunggah…' : '⤒ Unggah Master' }}
          </button>

          <a
            :href="urlUnduh"
            class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded px-2.5 py-1.5 hover:bg-emerald-100 transition-colors"
            title="Unduh hasil audit (mengikuti filter yang sedang dipakai) sebagai Excel"
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
            @click="muat()"
            :disabled="loadingAudit"
            class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 border border-gray-200 rounded hover:border-blue-400 transition-all disabled:opacity-40 bg-white"
            title="Segarkan"
          >
            <svg :class="['w-3.5 h-3.5', loadingAudit ? 'animate-spin' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <p class="font-semibold">Membandingkan pengurang stok welding dengan Master IFPP Inhouse &amp; Outhouse.</p>
          <p class="text-blue-700 mt-0.5 text-xs">
            Part <span class="font-semibold">routing SINGLE dikecualikan</span> — part itu tidak dikonsumsi lewat
            BOM welding, jadi tidak adanya pengurangan memang wajar. Nilai SINGLE hanya ada di file Master,
            tidak ada di database rundown, karena itu file-nya perlu diunggah supaya bisa disaring.
          </p>
        </div>
      </div>

      <!-- ── Kesegaran sumber ───────────────────────────────── -->
      <div v-if="auditMeta.sumber?.length" class="flex flex-wrap gap-2">
        <div
          v-for="s in auditMeta.sumber"
          :key="s.source_file"
          class="flex items-center gap-3 bg-white border rounded px-3 py-2 text-xs shadow-sm"
          :class="(umurHari(s.sheet_generated) ?? 0) > 30 ? 'border-amber-300' : 'border-gray-200'"
        >
          <span class="font-bold text-gray-700">{{ s.source_file }}</span>
          <span class="text-gray-500">{{ Number(s.non_single).toLocaleString('id-ID') }} diaudit</span>
          <span class="text-gray-400">· {{ Number(s.single_part).toLocaleString('id-ID') }} SINGLE</span>
          <span v-if="s.sheet_generated" :class="(umurHari(s.sheet_generated) ?? 0) > 30 ? 'text-amber-700 font-semibold' : 'text-gray-500'">
            · sheet {{ fmtTgl(s.sheet_generated) }}
            <template v-if="(umurHari(s.sheet_generated) ?? 0) > 30">({{ umurHari(s.sheet_generated) }} hari lalu)</template>
          </span>
          <span v-else class="text-gray-400 italic">· sheet tanpa tanggal</span>
        </div>
      </div>

      <div v-if="errorAudit" class="flex items-center gap-2 bg-red-50 border border-red-300 rounded px-3 py-2.5 text-sm text-red-700">
        <span>⚠</span> {{ errorAudit }}
      </div>

      <!-- ── Ringkasan + kontrol ────────────────────────────── -->
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="flex flex-wrap gap-3">
          <div class="bg-white rounded border border-gray-200 shadow-sm px-4 py-2">
            <div class="text-gray-400 text-xs">Part diaudit</div>
            <div class="text-xl font-black tabular-nums">{{ animTotal.toLocaleString('id-ID') }}</div>
          </div>
          <div class="bg-white rounded border border-green-200 shadow-sm px-4 py-2">
            <div class="text-gray-400 text-xs">Sehat</div>
            <div class="text-xl font-black text-green-700 tabular-nums">{{ animOk.toLocaleString('id-ID') }}</div>
          </div>
          <div class="bg-white rounded border border-red-200 shadow-sm px-4 py-2">
            <div class="text-gray-400 text-xs">Perlu dicek</div>
            <div class="text-xl font-black text-red-700 tabular-nums">{{ animTemuan.toLocaleString('id-ID') }}</div>
          </div>
          <div class="bg-white rounded border border-gray-200 shadow-sm px-4 py-2">
            <div class="text-gray-400 text-xs">SINGLE dikecualikan</div>
            <div class="text-xl font-black text-gray-500 tabular-nums">{{ animSingle.toLocaleString('id-ID') }}</div>
          </div>
        </div>

        <div class="flex items-end gap-2">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Sumber</label>
            <select v-model="fSource" @change="muat()" class="bg-white border border-gray-300 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option value="">Semua</option>
              <option value="INHOUSE">Inhouse</option>
              <option value="OUTHOUSE">Outhouse</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Ambang mandek</label>
            <select v-model.number="hari" @change="muat()" class="bg-white border border-gray-300 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400">
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
            class="bg-white border border-gray-300 text-sm rounded px-2 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      <!-- ── Pintasan per status ────────────────────────────── -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="fStatus = ''; muat()"
          :class="[
            'text-xs font-semibold px-2.5 py-1 rounded border transition-colors',
            fStatus === '' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          ]"
        >
          Semua
        </button>
        <button
          v-for="[st, n] in temuan"
          :key="st"
          @click="fStatus = st; muat()"
          :class="[
            'text-xs font-semibold px-2.5 py-1 rounded border transition-colors',
            fStatus === st ? 'ring-2 ring-offset-1 ring-gray-400 ' + nada(st) : nada(st) + ' hover:opacity-80'
          ]"
        >
          {{ st }} <span class="tabular-nums">{{ n }}</span>
        </button>
        <button
          @click="fStatus = 'OK'; muat()"
          :class="[
            'text-xs font-semibold px-2.5 py-1 rounded border transition-colors',
            fStatus === 'OK' ? 'ring-2 ring-offset-1 ring-gray-400 ' + nada('OK') : nada('OK') + ' hover:opacity-80'
          ]"
        >
          OK <span class="tabular-nums">{{ auditMeta.per_status?.['OK'] ?? 0 }}</span>
        </button>
      </div>

      <!-- ── Tabel ──────────────────────────────────────────── -->
      <div class="rounded border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div v-if="loadingAudit && auditRows.length === 0" class="flex items-center justify-center py-24 bg-gray-50">
          <div class="flex items-center gap-2 text-gray-400 text-sm">
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Memuat audit...
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-100 border-b border-gray-200">
              <tr>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Part IFPP</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Job</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Kat.</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Routing</th>
                <th class="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">Stok master</th>
                <th class="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">Stok rundown</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Welding</th>
                <th class="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">Terakhir kurang</th>
                <th class="px-3 py-2.5 text-center text-gray-500 font-semibold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="rows.length === 0">
                <td colspan="9" class="py-12 text-center text-gray-400">
                  <template v-if="!loadingAudit">Tidak ada baris untuk filter ini 🎉</template>
                </td>
              </tr>
              <tr v-for="r in rows" :key="r.part_number" :class="['hover:bg-gray-50', nadaBaris(String(r.status_audit))]">
                <td class="px-3 py-2 font-mono font-semibold text-blue-700">{{ r.part_number }}</td>
                <td class="px-3 py-2 font-mono text-gray-600">{{ r.job_number || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ r.category || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ r.routing || '—' }}</td>
                <td class="px-3 py-2 text-right font-mono tabular-nums">
                  {{ r.stock_master === null ? '—' : Number(r.stock_master).toLocaleString('id-ID') }}
                </td>
                <td
                  class="px-3 py-2 text-right font-mono tabular-nums"
                  :class="Number(r.stock_rundown) < 0 ? 'text-red-600 font-bold' : 'text-gray-600'"
                >
                  {{ r.stock_rundown === null ? '—' : Number(r.stock_rundown).toLocaleString('id-ID') }}
                </td>
                <td class="px-3 py-2 font-mono text-gray-600 max-w-[200px] truncate" :title="r.daftar_welding || ''">
                  {{ r.daftar_welding || '—' }}
                </td>
                <td class="px-3 py-2 font-mono" :class="r.terakhir_deduksi ? 'text-gray-600' : 'text-amber-700 font-semibold'">
                  {{ fmtTgl(r.terakhir_deduksi) }}
                </td>
                <td class="px-3 py-2 text-center">
                  <span :class="['text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap', nada(String(r.status_audit))]">
                    {{ r.status_audit }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="text-xs text-gray-400">
        {{ auditMeta.catatan }}
      </p>
    </main>

    <ToastNotif :message="actionMessage" :success="actionSuccess" @close="store.clearActionMessage()" />
  </div>
</template>
