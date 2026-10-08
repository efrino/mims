<script setup lang="ts">
import { ref } from 'vue';
import type { ProcessMode } from '@/types/Public/Welding/stockQueue';

const props = defineProps<{ loading: boolean; mode: ProcessMode; savingMode?: boolean }>();
const emit = defineEmits<{ manualProcess: [ProcessMode]; retryFailed: []; purgeDone: [number]; 'update:mode': [ProcessMode] }>();

const showPurgeModal    = ref(false);
const purgeDays         = ref(7);
const showConfirmType   = ref<'process' | 'retry' | null>(null);

// Mode dikontrol parent (persisted auto-mode). Selector ini juga jadi patokan Manual Process.
function selectMode(value: ProcessMode) {
  if (value !== props.mode) emit('update:mode', value);
}

const MODE_OPTIONS: { value: ProcessMode; label: string; color: string; activeColor: string }[] = [
  { value: 'INHOUSE',  label: 'In-House',  color: 'text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600', activeColor: 'bg-indigo-600 border-indigo-600 text-white' },
  { value: 'OUTHOUSE', label: 'Out-House', color: 'text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600',  activeColor: 'bg-purple-600 border-purple-600 text-white' },
  { value: 'ALL',      label: 'All',       color: 'text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600',      activeColor: 'bg-teal-600 border-teal-600 text-white' },
];

const modeActiveColor: Record<ProcessMode, string> = {
  INHOUSE:  'text-indigo-700 bg-indigo-50 border-indigo-300',
  OUTHOUSE: 'text-purple-700 bg-purple-50 border-purple-300',
  ALL:      'text-teal-700 bg-teal-50 border-teal-300',
};

const MODE_LABEL: Record<ProcessMode, string> = {
  INHOUSE:  'In-House',
  OUTHOUSE: 'Out-House',
  ALL:      'All',
};

const MODE_DESC: Record<ProcessMode, string> = {
  INHOUSE:  'Hanya part produksi sendiri',
  OUTHOUSE: 'Hanya part dari supplier',
  ALL:      'In-house + out-house sekaligus',
};

function confirmAction(type: 'process' | 'retry') { showConfirmType.value = type; }
function executeConfirmed() {
  if (showConfirmType.value === 'process') emit('manualProcess', props.mode);
  if (showConfirmType.value === 'retry')   emit('retryFailed');
  showConfirmType.value = null;
}
function executePurge() {
  emit('purgeDone', purgeDays.value);
  showPurgeModal.value = false;
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">

    <!-- ── Mode Selector (auto-process, tersimpan) ────────── -->
    <div class="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded p-0.5">
      <span
        class="text-xs text-gray-500 font-semibold pl-1.5 pr-0.5 select-none flex items-center gap-1"
        title="Mode ini dipakai sistem untuk proses otomatis (MySQL Event) dan juga Manual Process. Perubahan langsung tersimpan."
      >
        Mode otomatis
        <svg v-if="savingMode" class="animate-spin w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </span>
      <div class="flex">
        <button
          v-for="(opt, i) in MODE_OPTIONS"
          :key="opt.value"
          @click="selectMode(opt.value)"
          :disabled="loading || savingMode"
          :class="[
            'px-2.5 py-1 text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            i === 0 ? 'rounded-l' : i === MODE_OPTIONS.length - 1 ? 'rounded-r' : '',
            i > 0 ? '-ml-px' : '',
            mode === opt.value ? opt.activeColor : opt.color + ' bg-white'
          ]"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- ── Divider ────────────────────────────────────────── -->
    <div class="h-5 w-px bg-gray-300" />

    <!-- ── Manual Process ─────────────────────────────────── -->
    <button
      @click="confirmAction('process')"
      :disabled="loading"
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
    >
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Manual Process
    </button>

    <!-- ── Retry Failed ───────────────────────────────────── -->
    <button
      @click="confirmAction('retry')"
      :disabled="loading"
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
    >
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Retry Failed
    </button>

    <!-- ── Purge Done ─────────────────────────────────────── -->
    <button
      @click="showPurgeModal = true"
      :disabled="loading"
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
    >
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Purge Done
    </button>

    <!-- ── Spinner ────────────────────────────────────────── -->
    <svg v-if="loading" class="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  </div>

  <!-- ── Modals ─────────────────────────────────────────────── -->
  <Teleport to="body">

    <!-- Confirm process / retry -->
    <Transition name="modal">
      <div
        v-if="showConfirmType"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="showConfirmType = null"
      >
        <div class="bg-white border border-gray-200 rounded-xl p-5 w-full max-w-sm mx-4 shadow-xl">
          <h3 class="text-gray-800 font-bold text-sm mb-3">
            {{ showConfirmType === 'process' ? '⚙️ Manual Process' : '🔁 Retry Failed' }}
          </h3>

          <!-- Process confirm -->
          <template v-if="showConfirmType === 'process'">
            <p class="text-gray-500 text-sm mb-3">
              Jalankan
              <code class="bg-gray-100 px-1 rounded text-blue-600 text-xs">sp_process_stock_queue()</code>
              sekarang?
            </p>

            <!-- Selected mode badge -->
            <div :class="['flex items-center gap-2 rounded border px-3 py-2 mb-4', modeActiveColor[mode]]">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="text-xs font-bold leading-none">Mode: {{ MODE_LABEL[mode] }}</p>
                <p class="text-xs mt-0.5 opacity-75">{{ MODE_DESC[mode] }}</p>
              </div>
            </div>
          </template>

          <!-- Retry confirm -->
          <p v-else class="text-gray-500 text-sm mb-4">
            Reset semua baris <strong class="text-red-600">FAILED</strong> menjadi
            <strong class="text-amber-600">PENDING</strong> untuk diproses ulang?
          </p>

          <div class="flex gap-2 justify-end">
            <button
              @click="showConfirmType = null"
              class="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >Batal</button>
            <button
              @click="executeConfirmed"
              class="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >Ya, Lanjutkan</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Purge Done modal -->
    <Transition name="modal">
      <div
        v-if="showPurgeModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="showPurgeModal = false"
      >
        <div class="bg-white border border-gray-200 rounded-xl p-5 w-full max-w-sm mx-4 shadow-xl">
          <h3 class="text-gray-800 font-bold text-sm mb-2">🗑️ Purge Done</h3>
          <p class="text-gray-500 text-sm mb-3">
            Hapus permanen baris <strong class="text-green-700">DONE</strong> lebih dari berapa hari?
          </p>
          <div class="flex items-center gap-2 mb-4">
            <input
              v-model.number="purgeDays"
              type="number" min="1" max="365"
              class="w-20 bg-white border border-gray-300 text-gray-700 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400 font-mono"
            />
            <span class="text-gray-500 text-sm">hari yang lalu</span>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              @click="showPurgeModal = false"
              class="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >Batal</button>
            <button
              @click="executePurge"
              class="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
            >Hapus</button>
          </div>
        </div>
      </div>
    </Transition>

  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.15s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; transform: scale(0.97); }
</style>
