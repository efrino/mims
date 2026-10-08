<!-- components/welding/mutation/Header.vue -->
<template>
  <!-- ── Main Header Bar ──────────────────────────────────────────── -->
  <header class="bg-white border-b border-slate-200 shadow-sm flex-shrink-0 z-[200]">
    <div class="hdr-row h-[52px] flex items-center px-4 gap-3">
      <!-- ── Logo + Title ─────────────────────────────────────── -->
      <div class="flex items-center gap-2.5 flex-shrink-0">
        <div
          class="w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm flex-shrink-0"
          :class="iconGradient"
        >
          <i class="mdi text-white" :class="iconClass" style="font-size: 15px"></i>
        </div>
        <div>
          <h1 class="text-sm font-bold text-slate-800 leading-tight">{{ title }}</h1>
          <p class="text-[11px] text-slate-400 leading-none mt-0.5">
            Periode: <span class="font-semibold text-slate-600">{{ currentMonth }}</span>
          </p>
        </div>
      </div>


      <!-- ── Area Selector ─────────────────────────────────────── -->
      <div class="relative flex-shrink-0" ref="areaDropdownRef">
        <button
          @click="showAreaDropdown = !showAreaDropdown"
          class="h-8 flex items-center gap-1.5 pl-2.5 pr-2 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all duration-150 select-none focus:outline-none"
        >
          <i class="mdi mdi-factory text-sm leading-none"></i>
          <span>{{ areaName }}</span>
          <i
            class="mdi mdi-chevron-down text-xs leading-none transition-transform duration-150"
            :class="{ 'rotate-180': showAreaDropdown }"
          ></i>
        </button>

        <Transition name="dd">
          <div
            v-if="showAreaDropdown"
            class="absolute left-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            style="z-index: 999999999 !important"
          >
            <div class="px-3 py-2.5 bg-slate-50 border-b border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Area Welding</p>
            </div>
            <!-- Area master (WSS/CO/SA × plant). 1 pilihan = 1 area master (kode area
                 dipakai langsung di data sejak migrasi 2026-09-24). -->
            <ul class="py-1 max-h-[70vh] overflow-y-auto">
              <template v-for="p in byPlant" :key="p.plant">
                <li class="px-3 pt-2 pb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ p.plant }}</li>
                <li v-for="a in p.areas" :key="a.area_code">
                  <button
                    @click="selectArea(a.area_code)"
                    class="w-full flex items-center gap-2.5 px-3 py-2 pl-5 text-xs transition-colors text-left"
                    :class="isCurrentArea(a.area_code) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'"
                  >
                    <span class="w-3.5 flex-shrink-0 text-center">
                      <i v-if="isCurrentArea(a.area_code)" class="mdi mdi-check text-blue-600 text-xs"></i>
                    </span>
                    <span class="area-type" :class="'t-' + a.area_type.toLowerCase()">{{ a.area_type }}</span>
                    {{ a.area_code }}
                    <span v-if="a.zones.length > 1" class="ml-auto text-[10px] text-slate-400" :title="a.zones.join(', ')">{{ a.zones.length }} zone</span>
                  </button>
                </li>
              </template>
            </ul>
          </div>
        </Transition>
      </div>

      <!-- Spacer -->
      <div class="flex-1 min-w-0"></div>

      <!-- ── Period Selector ───────────────────────────────────── -->
      <div class="flex items-center gap-1.5 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg flex-shrink-0">
        <i class="mdi mdi-calendar-month-outline text-slate-400 text-sm leading-none flex-shrink-0"></i>
        <select
          v-model="selectedMonth"
          @change="onPeriodChange"
          class="text-xs font-medium text-slate-700 bg-transparent border-0 outline-none cursor-pointer"
        >
          <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <div class="w-px h-4 bg-slate-300 flex-shrink-0"></div>
        <select
          v-model="selectedYear"
          @change="onPeriodChange"
          class="text-xs font-medium text-slate-700 bg-transparent border-0 outline-none cursor-pointer"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Divider -->
      <div class="hdr-divider w-px h-7 bg-slate-200 flex-shrink-0 mx-1"></div>

      <!-- ── Action Buttons ────────────────────────────────────── -->
      <!-- FP & WIP satu tabel, tapi file Excel-nya tetap terpisah per jenis →
           tiap tombol membuka pilihan FP / WIP. -->
      <div class="hdr-actions flex items-center gap-1.5 flex-shrink-0" ref="actionsRef">
        <div v-for="a in fileActions" :key="a.key" class="relative">
          <button
            @click="toggleKindMenu(a.key)"
            class="h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold text-white transition-colors shadow-sm focus:outline-none"
            :class="a.btnClass"
            :title="a.title"
          >
            <i class="mdi text-sm leading-none" :class="a.icon"></i>
            <span>{{ a.label }}</span>
            <i class="mdi mdi-chevron-down text-xs leading-none opacity-80"></i>
          </button>
          <Transition name="dd">
            <div v-if="kindMenu === a.key" class="kind-menu">
              <button
                v-for="k in KINDS" :key="k" class="kind-menu__item"
                :disabled="k === 'WIP'"
                :title="k === 'WIP' ? 'Belum tersedia: Mutasi WIP adalah data turunan dari plan FP induk (ubah lewat FP).' : undefined"
                @click="runFileAction(a.key, k)"
              >
                <span class="kind-dot" :class="k === 'WIP' ? 'kind-dot--wip' : 'kind-dot--fp'"></span>
                {{ a.label }} {{ k }}
                <span v-if="k === 'WIP'" class="kind-soon">segera</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>

  <!-- ── Upload Dialog ───────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showUploadDialog"
        class="fixed inset-0 flex items-center justify-center p-4"
        style="z-index: 500; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px)"
        @click.self="closeUploadDialog"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-[400px] max-w-full overflow-hidden">
          <!-- Dialog header -->
          <div class="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <i class="mdi mdi-upload text-sm"></i>
              </div>
              <span class="font-bold text-sm">Upload Mutasi {{ uploadKind }}</span>
            </div>
            <button
              @click="closeUploadDialog"
              class="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <i class="mdi mdi-close text-sm"></i>
            </button>
          </div>

          <!-- Dialog body -->
          <div class="p-5 space-y-4">
            <!-- Info note -->
            <div class="flex gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <i class="mdi mdi-information-outline text-amber-500 text-sm flex-shrink-0 mt-0.5"></i>
              <p class="text-xs text-amber-800 leading-relaxed">
                Upload file template <strong>{{ uploadKind }}</strong> yang sudah diisi. Hanya baris
                <strong>PLAN</strong> yang diperbarui. Sel terkunci secara otomatis dilewati.
              </p>
            </div>

            <!-- Drop zone -->
            <div
              class="border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all duration-200"
              :class="uploadFile ? 'border-amber-400 bg-amber-50/80' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'"
              @click="triggerFilePicker"
              @dragover.prevent
              @dragenter.prevent
              @drop.prevent="onFileDrop"
            >
              <input ref="fileInputRef" type="file" accept=".xlsx,.xls" class="hidden" @change="onFileChange" />

              <!-- File selected -->
              <div v-if="uploadFile" class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <i class="mdi mdi-file-excel text-2xl text-green-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-700 truncate">{{ uploadFile.name }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ (uploadFile.size / 1024).toFixed(1) }} KB · Excel</p>
                </div>
                <button
                  @click.stop="uploadFile = null"
                  class="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <i class="mdi mdi-close text-sm"></i>
                </button>
              </div>

              <!-- Empty state -->
              <div v-else class="flex flex-col items-center gap-2 text-slate-400 py-1">
                <i class="mdi mdi-cloud-upload-outline text-4xl text-slate-300"></i>
                <div class="text-center">
                  <p class="text-sm font-medium text-slate-500">Klik atau drop file di sini</p>
                  <p class="text-xs text-slate-400 mt-0.5">Format: .xlsx / .xls</p>
                </div>
              </div>
            </div>

            <!-- Error -->
            <p v-if="uploadDialogError" class="flex items-center gap-1.5 text-xs text-red-600">
              <i class="mdi mdi-alert-circle-outline"></i>
              {{ uploadDialogError }}
            </p>

            <!-- Footer actions -->
            <div class="flex gap-2">
              <button
                @click="closeUploadDialog"
                class="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                @click="handleUpload"
                :disabled="!uploadFile"
                class="flex-1 h-9 rounded-lg text-sm font-semibold transition-colors focus:outline-none"
                :class="uploadFile ? 'btn-upload text-white shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
              >
                <i class="mdi mdi-upload mr-1.5 text-sm leading-none"></i>
                Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useWeldingAreas } from '@/composables/useWeldingAreas';
import type { MutasiKind } from '@/types/Public/Welding/planning';

interface Area {
  code: string;
  label: string;
  param: string;
}


interface Props {
  areaName: string;
  currentMonth: string;
  areaCode?: string;
  title?: string;
  iconClass?: string;
  iconGradient?: string;
}

const props = withDefaults(defineProps<Props>(), {
  areaCode: '',
  title: 'Mutasi Bulanan',
  iconClass: 'mdi-swap-horizontal-bold',
  iconGradient: 'from-blue-500 to-blue-700',
});

const emit = defineEmits<{
  periodChange: [data: { month: number; year: number }];
  areaChange: [area: Area];
  download: [kind: MutasiKind];
  downloadAll: [kind: MutasiKind];
  template: [kind: MutasiKind];
  upload: [file: File, kind: MutasiKind];
}>();

// ── Aksi file (Download / Semua Area / Template / Upload) per jenis FP / WIP ──
const KINDS: MutasiKind[] = ['FP', 'WIP'];
type FileAction = 'download' | 'downloadAll' | 'template' | 'upload';
const fileActions: { key: FileAction; label: string; icon: string; btnClass: string; title: string }[] = [
  { key: 'download',    label: 'Download',   icon: 'mdi-microsoft-excel',       btnClass: 'btn-download',     title: 'Download Excel Mutasi (area ini) — tab baru' },
  { key: 'downloadAll', label: 'Semua Area', icon: 'mdi-file-multiple-outline', btnClass: 'btn-download-all', title: 'Download SEMUA area dalam 1 file (1 sheet per area) — tab baru' },
  { key: 'template',    label: 'Template',   icon: 'mdi-file-download-outline', btnClass: 'btn-template',     title: 'Download Template Excel untuk Upload' },
  { key: 'upload',      label: 'Upload',     icon: 'mdi-upload',                btnClass: 'btn-upload',       title: 'Upload file template yang sudah diisi' },
];
const kindMenu   = ref<FileAction | null>(null);
const actionsRef = ref<HTMLElement | null>(null);
const uploadKind = ref<MutasiKind>('FP');

function toggleKindMenu(key: FileAction) {
  kindMenu.value = kindMenu.value === key ? null : key;
}
// WIP: backend download/template/upload belum ada (HTTP 501) — WIP turunan dari plan FP.
function runFileAction(key: FileAction, kind: MutasiKind) {
  if (kind === 'WIP') return;
  kindMenu.value = null;
  if (key === 'upload') { uploadKind.value = kind; showUploadDialog.value = true; return; }
  if (key === 'download') emit('download', kind);
  else if (key === 'downloadAll') emit('downloadAll', kind);
  else emit('template', kind);
}

// ── Area dropdown ─────────────────────────────────────────────────
const showAreaDropdown = ref(false);
const areaDropdownRef = ref<HTMLElement | null>(null);

// Area master (useWeldingAreas, aktif saja), dikelompokkan per plant.
const { byPlant, load: loadAreaGroups } = useWeldingAreas();

function isCurrentArea(code: string): boolean {
  if (props.areaCode) return props.areaCode.toUpperCase() === code.toUpperCase();
  return props.areaName.toUpperCase().replace(/\s+/g, '_') === code.toUpperCase();
}

function selectArea(code: string) {
  showAreaDropdown.value = false;
  emit('areaChange', { code, label: code, param: code.replace(/\s+/g, '-') });
}

function onClickOutside(e: MouseEvent) {
  if (areaDropdownRef.value && !areaDropdownRef.value.contains(e.target as Node)) {
    showAreaDropdown.value = false;
  }
  if (actionsRef.value && !actionsRef.value.contains(e.target as Node)) kindMenu.value = null;
}

// ── Period ────────────────────────────────────────────────────────
const months = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

const currentYear = new Date().getFullYear();
const years = ref<number[]>([]);
for (let i = currentYear - 2; i <= currentYear + 2; i++) years.value.push(i);

const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(currentYear);

function onPeriodChange() {
  emit('periodChange', { month: selectedMonth.value, year: selectedYear.value });
}

// ── Upload dialog ─────────────────────────────────────────────────
const showUploadDialog = ref(false);
const uploadFile = ref<File | null>(null);
const uploadDialogError = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerFilePicker() {
  fileInputRef.value?.click();
}

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) {
    uploadFile.value = f;
    uploadDialogError.value = null;
  }
}

function onFileDrop(e: DragEvent) {
  const f = e.dataTransfer?.files[0];
  if (f) {
    uploadFile.value = f;
    uploadDialogError.value = null;
  }
}

function closeUploadDialog() {
  showUploadDialog.value = false;
  uploadFile.value = null;
  uploadDialogError.value = null;
}

function handleUpload() {
  if (!uploadFile.value) return;
  emit('upload', uploadFile.value, uploadKind.value);
  closeUploadDialog();
}

// ── Lifecycle ─────────────────────────────────────────────────────
onMounted(() => { document.addEventListener('click', onClickOutside); loadAreaGroups(); });
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>

<style scoped>
/* Badge tipe area (WSS / CO / SA) di dropdown */
.area-type { display: inline-block; min-width: 30px; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 800; letter-spacing: .04em; text-align: center; background: var(--dm-tint-blue, #EEF2FF); color: #4F46E5; }
.area-type.t-co { background: var(--dm-tint-green, #F0FDF4); color: var(--dm-on-green, #15803D); }
.area-type.t-sa { background: var(--dm-tint-amber, #FFF7ED); color: var(--dm-on-amber, #C2410C); }

/* ── Dropdown transition ───────────────────────── */
.dd-enter-active,
.dd-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.dd-enter-from,
.dd-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

/* ── Modal transition ──────────────────────────── */
.modal-enter-active {
  transition: opacity 0.15s ease;
}
.modal-leave-active {
  transition: opacity 0.12s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.15s ease;
}
.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.96) translateY(-8px);
}

/* Menu pilihan FP / WIP di tombol aksi file */
.kind-menu {
  position: absolute; right: 0; top: calc(100% + 6px); min-width: 150px; z-index: 999999999;
  background: var(--dm-surface, #fff); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 10px; padding: 4px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, .18);
}
.kind-menu__item {
  width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 7px;
  font-size: 12px; font-weight: 600; color: var(--dm-cell, #334155); text-align: left; white-space: nowrap;
}
.kind-menu__item:hover:not(:disabled) { background: var(--dm-bg, #f1f5f9); }
.kind-menu__item:disabled { color: var(--dm-faint, #94a3b8); cursor: not-allowed; }
.kind-soon { margin-left: auto; font-size: 9.5px; font-weight: 700; color: var(--dm-faint, #94a3b8); background: var(--dm-bg, #f1f5f9); border-radius: 999px; padding: 1px 6px; }
.kind-dot { width: 8px; height: 8px; border-radius: 9999px; flex-shrink: 0; }
.kind-dot--fp  { background: #2563eb; }
.kind-dot--wip { background: #7c3aed; }

/* HP/tablet: bar header boleh turun baris (periode & tombol aksi tidak terpotong). */
@media (max-width: 1024px) {
  .hdr-row { height: auto !important; min-height: 52px; flex-wrap: wrap; row-gap: 8px; padding-top: 8px; padding-bottom: 8px; }
  .hdr-row > .flex-1, .hdr-divider { display: none; }
  .hdr-actions { flex-wrap: wrap; row-gap: 6px; flex-shrink: 1 !important; max-width: 100%; }
}

/* Native select cleanup */
/* Native select cleanup — plugin form global memasang chevron besar yang
   menimpa teks; ganti dgn chevron kecil sendiri di kanan. */
select {
  -webkit-appearance: none;
  appearance: none;
  padding: 0 14px 0 2px !important;
  background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 2px center / 8px 5px !important;
  box-shadow: none !important;
}

/* ── Action buttons — override Flowbite/Vuetify button reset ── */
.btn-download { background-color: #059669 !important; }
.btn-download:hover { background-color: #047857 !important; }
.btn-download:active { background-color: #065f46 !important; }

.btn-download-all { background-color: #0d9488 !important; }
.btn-download-all:hover { background-color: #0f766e !important; }
.btn-download-all:active { background-color: #115e59 !important; }

.btn-template { background-color: #7c3aed !important; }
.btn-template:hover { background-color: #6d28d9 !important; }
.btn-template:active { background-color: #5b21b6 !important; }

.btn-upload { background-color: #f59e0b !important; }
.btn-upload:hover { background-color: #d97706 !important; }
.btn-upload:active { background-color: #b45309 !important; }
</style>
