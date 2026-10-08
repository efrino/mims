<!-- components/welding/master/MasterAppMenu.vue
     "Menu Aplikasi" master data: launcher tile (kategori update via paste, Pasang WIP,
     Komparasi Part, Unduh per Area) + modal "Unduh Data per Area" yang hanya bisa
     dibuka dari sini. Shortcut keyboard (1-4 / W / K / D / Esc) ditangani di sini
     saat menu terbuka. Dipisah dari master-data.vue (2026-09-22). -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" v-modal-stack="() => emit('close')" class="modal-overlay" @click.self.prevent>
        <div class="modal-box modal-confirm">
          <div class="modal-header">
            <div class="modal-header-icon"><i class="mdi mdi-apps"></i></div>
            <div>
              <p class="modal-title">Menu Aplikasi</p>
              <p class="modal-subtitle">Pilih jenis import / unggah data</p>
            </div>
            <button class="modal-close" @click="emit('close')"><i class="mdi mdi-close"></i></button>
          </div>
          <div class="modal-body">
            <div class="app-menu-grid">
              <button v-for="cat in categories" :key="cat.key" type="button" class="app-menu-tile"
                      :title="`${cat.label} (${cat.shortcut})`" @click="pick('upload', cat)">
                <kbd class="app-menu-kbd">{{ cat.shortcut }}</kbd>
                <span class="app-menu-icon"><i :class="`mdi ${cat.icon}`"></i></span>
                <span class="app-menu-label">{{ cat.label }}</span>
              </button>
              <button type="button" class="app-menu-tile" title="Papan pemasangan WIP ke FP (W)" @click="pick('pairing')">
                <kbd class="app-menu-kbd">W</kbd>
                <span class="app-menu-icon app-menu-icon--blue"><i class="mdi mdi-power-plug-outline"></i></span>
                <span class="app-menu-label">Pasang WIP</span>
              </button>
              <button type="button" class="app-menu-tile" title="Bandingkan daftar part (paste dari Excel) dengan master pada filter aktif (K)" @click="pick('compare')">
                <kbd class="app-menu-kbd">K</kbd>
                <span class="app-menu-icon app-menu-icon--teal"><i class="mdi mdi-compare-horizontal"></i></span>
                <span class="app-menu-label">Komparasi Part</span>
              </button>
              <button type="button" class="app-menu-tile" title="Unduh data Excel per area, pilih satu atau beberapa (D)" @click="openAreaDownload">
                <kbd class="app-menu-kbd">D</kbd>
                <span class="app-menu-icon app-menu-icon--green"><i class="mdi mdi-microsoft-excel"></i></span>
                <span class="app-menu-label">Unduh per Area</span>
              </button>
            </div>
          </div>
          <div class="modal-footer"><span class="kbd-hint"><kbd>Esc</kbd> tutup</span></div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Unduh Data per Area — pilih 0..N area, kosong = semua -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="dl.open" v-modal-stack="() => (dl.open = false)" class="modal-overlay" @click.self.prevent>
        <div class="modal-box modal-confirm" style="width:420px">
          <div class="modal-header">
            <div class="modal-header-icon"><i class="mdi mdi-microsoft-excel"></i></div>
            <div>
              <p class="modal-title">Unduh Data per Area</p>
              <p class="modal-subtitle">Kosongkan pilihan untuk unduh semua area</p>
            </div>
            <button class="modal-close" @click="dl.open = false"><i class="mdi mdi-close"></i></button>
          </div>
          <div class="modal-body">
            <div v-if="dl.loading" style="padding:24px;text-align:center;color:var(--text-secondary)"><i class="mdi mdi-loading mdi-spin" style="font-size:26px"></i></div>
            <template v-else>
              <label class="area-dl-row area-dl-row--head">
                <input type="checkbox" :checked="allChecked" @change="toggleAll" /> Pilih semua ({{ dl.areas.length }} area)
              </label>
              <div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:2px">
                <label v-for="a in dl.areas" :key="a" class="area-dl-row"><input type="checkbox" :value="a" v-model="dl.selected" /> {{ a }}</label>
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <span class="kbd-hint">{{ dl.selected.length || 'Semua' }} area</span>
            <button class="md-btn md-btn-ghost" @click="dl.open = false">Batal</button>
            <button class="md-btn md-btn-green" :disabled="dl.loading" @click="confirmDownload"><i class="mdi mdi-download"></i> Unduh</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import { vModalStack } from '@/directives/modalStack';

export interface AppMenuCategory { key: string; label: string; icon: string; shortcut: string }

const props = defineProps<{ open: boolean; categories: AppMenuCategory[] }>();
const emit = defineEmits<{
  close: [];
  upload: [cat: AppMenuCategory];
  pairing: [];
  compare: [];
}>();

function pick(what: 'upload' | 'pairing' | 'compare', cat?: AppMenuCategory) {
  emit('close');
  if (what === 'upload' && cat) emit('upload', cat);
  else if (what === 'pairing') emit('pairing');
  else if (what === 'compare') emit('compare');
}

// ── Unduh per Area ──
const dl = reactive<{ open: boolean; loading: boolean; areas: string[]; selected: string[] }>({ open: false, loading: false, areas: [], selected: [] });
const allChecked = computed(() => dl.areas.length > 0 && dl.selected.length === dl.areas.length);
function toggleAll(e: Event) { dl.selected = (e.target as HTMLInputElement).checked ? [...dl.areas] : []; }
async function openAreaDownload() {
  emit('close');
  Object.assign(dl, { open: true, loading: true, areas: [], selected: [] });
  try { dl.areas = await masterService.getAreas(); } catch { dl.areas = []; }
  finally { dl.loading = false; }
}
function confirmDownload() {
  const sel = dl.selected;
  masterService.downloadData(sel.length === 1 ? sel[0] : null, sel.length > 1 ? sel.join(',') : null);
  dl.open = false;
}

// ── Shortcut saat menu terbuka (capture: sebelum handler global master-data). Esc ditangani v-modal-stack. ──
function onKey(e: KeyboardEvent) {
  if (dl.open || !props.open) return;
  const t = e.target as HTMLElement | null;
  const tag = (t?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const k = e.key.toLowerCase();
  const cat = props.categories.find(c => c.shortcut === e.key);
  let handled = true;
  if (cat) pick('upload', cat);
  else if (k === 'w') pick('pairing');
  else if (k === 'k') pick('compare');
  else if (k === 'd') openAreaDownload();
  else handled = false;
  if (handled) { e.preventDefault(); e.stopPropagation(); }
}
onMounted(() => document.addEventListener('keydown', onKey, true));
onUnmounted(() => document.removeEventListener('keydown', onKey, true));
</script>

<style scoped>
/* Modal generik — disalin (scoped tidak menular antar komponen, lihat MovePartAreaModal.vue). */
.modal-overlay { position: fixed; inset: 0; z-index: 99990; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }
.modal-box { background: var(--dm-surface, white); border-radius: 10px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; max-height: 90vh; overflow: hidden; }
.modal-confirm { width: 440px; max-width: 100%; }
.modal-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: linear-gradient(135deg, #2e5396, #4472c4); color: white; flex-shrink: 0; }
.modal-header-icon { width: 34px; height: 34px; border-radius: 8px; background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.modal-title { font-size: 13px; font-weight: 700; margin: 0; }
.modal-subtitle { font-size: 11px; opacity: 0.85; margin: 0; }
.modal-close { margin-left: auto; width: 28px; height: 28px; border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; border: none; flex-shrink: 0; }
.modal-close:hover { background: rgba(255, 255, 255, 0.25); }
.modal-body { padding: 16px; overflow-y: auto; flex: 1; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; background: var(--dm-surface2, #f8fafc); border-top: 1px solid var(--dm-border, #e5e9f0); flex-shrink: 0; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.18s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.kbd-hint { margin-right: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--dm-faint, #94a3b8); }
.kbd-hint kbd { font-size: 9px; padding: 1px 4px; border: 1px solid var(--dm-border-strong, #cbd5e1); border-radius: 3px; background: var(--dm-surface, #fff); }
.md-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; white-space: nowrap; font-family: inherit; }
.md-btn-ghost { background: transparent; color: var(--dm-muted, #6b7280); border: 1.5px solid var(--dm-border, #e5e7eb); }
.md-btn-ghost:hover { background: var(--dm-bg, #f3f4f6); }
.md-btn-green { background: #16a34a; color: white; }
.md-btn-green:hover { background: #15803d; }
.md-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.app-menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 14px; padding: 4px 0; }
.app-menu-tile { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 6px; border: none; background: transparent; cursor: pointer; border-radius: 12px; transition: background 0.15s; font-family: inherit; }
.app-menu-tile:hover { background: var(--dm-bg, #f1f5f9); }
.app-menu-tile:active { background: var(--dm-bg, #e2e8f0); }
.app-menu-kbd { position: absolute; top: 4px; right: 8px; font-size: 10px; font-weight: 700; color: var(--dm-muted, #64748b); background: var(--dm-bg, #f1f5f9); border: 1px solid var(--dm-border, #e2e8f0); border-radius: 4px; padding: 1px 5px; line-height: 1.4; }
.app-menu-icon { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; border-radius: 14px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; font-size: 24px; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.35); }
.app-menu-icon--blue  { background: linear-gradient(135deg, #2563eb, #3b82f6); box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35); }
.app-menu-icon--teal  { background: linear-gradient(135deg, #0f766e, #14b8a6); box-shadow: 0 2px 6px rgba(15, 118, 110, 0.35); }
.app-menu-icon--green { background: linear-gradient(135deg, #16a34a, #22c55e); box-shadow: 0 2px 6px rgba(22, 163, 74, 0.35); }
.app-menu-label { font-size: 11.5px; font-weight: 600; color: var(--dm-cell, #334155); text-align: center; line-height: 1.3; }
.area-dl-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 5px 4px; border-radius: 5px; cursor: pointer; }
.area-dl-row:hover { background: var(--bg-secondary, var(--dm-bg, #f1f5f9)); }
.area-dl-row--head { font-weight: 600; color: var(--text-secondary, var(--dm-muted, #64748b)); padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid var(--border-color, var(--dm-border, #e2e8f0)); border-radius: 0; }
</style>
