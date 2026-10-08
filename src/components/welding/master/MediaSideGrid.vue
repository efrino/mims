<!-- components/welding/master/MediaSideGrid.vue — grid upload foto 6 sisi (Depan…Bawah)
  untuk PART maupun PALLET (form Edit → Media). Tiap slot = 1 foto; upload ke slot terisi =
  ganti (foto lama tetap di galeri, tag sisinya lepas). Opsi hapus background (ISNet). -->
<template>
  <div class="msg">
    <div class="media-gallery-divider">
      <i class="mdi mdi-rotate-3d"></i> Foto 6 Sisi <span class="hint">({{ hint }})</span>
      <label class="side-bg-toggle" title="Background foto dihapus di latar belakang server (±20 detik/foto, antre satu per satu)">
        <input v-model="removeBg" type="checkbox" /> Hapus background otomatis
      </label>
    </div>
    <div class="side-grid">
      <div v-for="s in CUBE_SIDES" :key="s.key" class="side-slot" :class="{ 'side-slot--filled': !!map[s.key] }">
        <label class="side-slot-drop" :class="{ 'img-upload--loading': uploading === s.key }" :title="map[s.key] ? 'Ganti foto ' + s.label : 'Upload foto ' + s.label">
          <img v-if="map[s.key]" :src="src(map[s.key]!)" :alt="s.label" />
          <span v-if="map[s.key]?.bg_pending" class="side-bg-pending"><i class="mdi mdi-loading mdi-spin"></i> hapus bg…</span>
          <i v-else class="mdi" :class="uploading === s.key ? 'mdi-loading mdi-spin' : 'mdi-plus'"></i>
          <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" hidden :disabled="uploading !== null || disabled" @change="upload($event, s.key)" />
        </label>
        <span class="side-slot-label"><i class="mdi" :class="s.icon"></i> {{ s.label }}</span>
        <button v-if="map[s.key]" type="button" class="gallery-remove" title="Hapus foto sisi ini" @click="remove(map[s.key]!)"><i class="mdi mdi-close"></i></button>
        <button v-if="map[s.key] && !map[s.key]!.bg_pending" type="button" class="side-bg-btn" :disabled="bgBusy !== null"
                :title="map[s.key]!.file_path_original ? 'Kembalikan foto asli (dengan background)' : 'Hapus background foto ini'"
                @click="toggleBg(map[s.key]!)">
          <i class="mdi" :class="bgBusy === map[s.key]!.id ? 'mdi-loading mdi-spin' : map[s.key]!.file_path_original ? 'mdi-image-refresh-outline' : 'mdi-auto-fix'"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import { confirmDialog } from '@/utils/dialog';
import { CUBE_SIDES, sideMap } from './mediaSides';
import type { MediaViewSide, MsWeldingMedia } from '@/types/Public/Welding/master';

const props = withDefaults(defineProps<{ partId: number; kind: 'part' | 'pallet'; items: MsWeldingMedia[]; disabled?: boolean; hint?: string }>(),
  { disabled: false, hint: 'Depan, Belakang, Kiri, Kanan, Atas, Bawah' });
const emit = defineEmits<{ changed: []; error: [message: string] }>();

const map = computed(() => sideMap(props.items));
const uploading = ref<MediaViewSide | null>(null);
const bgBusy = ref<number | null>(null);
const removeBg = ref(true);
const src = (m: MsWeldingMedia) => m.url ?? masterService.getImageUrl(m.file_path) ?? undefined;

// Hapus-bg jalan di antrean server → selama ada foto yg masih antre, minta induk muat ulang tiap 4 dtk.
let poll = 0;
watch(() => props.items.some(m => m.bg_pending), (pending) => {
  clearInterval(poll);
  if (pending) poll = window.setInterval(() => emit('changed'), 4000);
}, { immediate: true });
onUnmounted(() => clearInterval(poll));

async function upload(e: Event, side: MediaViewSide) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  uploading.value = side;
  try {
    const res = await masterService.uploadMedia(props.partId, props.kind, file, side, removeBg.value);
    if (!res.success) emit('error', res.message);
    else if (res.warning) emit('error', res.warning);
    emit('changed');
  } catch (err: any) {
    emit('error', err?.response?.data?.message ?? 'Gagal upload foto sisi.');
  } finally {
    uploading.value = null;
  }
}
async function toggleBg(m: MsWeldingMedia) {
  bgBusy.value = m.id;
  try {
    const res = await masterService.mediaRemoveBg(m.id, !!m.file_path_original);
    if (!res.success) emit('error', res.message);
    emit('changed');
  } catch (err: any) {
    emit('error', err?.response?.data?.message ?? 'Gagal memproses background.');
  } finally {
    bgBusy.value = null;
  }
}
async function remove(m: MsWeldingMedia) {
  if (!await confirmDialog('Hapus foto sisi ini?')) return;
  try {
    const res = await masterService.deleteMedia(m.id);
    if (!res.success) emit('error', res.message);
    emit('changed');
  } catch (err: any) {
    emit('error', err?.response?.data?.message ?? 'Gagal menghapus media.');
  }
}
</script>

<style scoped>
/* Pembatas & tombol hapus: gaya sama dgn galeri di form (master-data.css scoped, tak menjangkau komponen ini). */
.media-gallery-divider { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--dm-faint, #94a3b8); margin: 10px 0 8px; padding-top: 8px; border-top: 1px dashed var(--dm-border, #e5e7eb); }
.media-gallery-divider .hint { text-transform: none; font-weight: 400; }
.gallery-remove { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; border-radius: 50%; border: none; background: rgba(17, 24, 39, 0.6); color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.gallery-remove:hover { background: #dc2626; }
.img-upload--loading { opacity: .6; pointer-events: none; }
/* Foto 6 sisi (3D) — slot per sisi, pola visual sama dgn gallery-item */
.side-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.side-slot { position: relative; display: flex; flex-direction: column; gap: 4px; }
.side-slot-drop {
  aspect-ratio: 1 / 1;
  border-radius: 7px;
  overflow: hidden;
  border: 1px dashed var(--dm-border-strong, #c3cbdc);
  background: var(--dm-bg, #f4f6fb);
  display: flex; align-items: center; justify-content: center;
  color: var(--dm-muted, #8b93a5);
  font-size: 20px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.side-slot-drop:hover { border-color: #2563eb; background: var(--dm-tint-blue, #eef3ff); color: var(--dm-accent, #2563eb); }
.side-slot--filled .side-slot-drop { border-style: solid; }
.side-slot-drop img { width: 100%; height: 100%; object-fit: contain; display: block; background: var(--dm-surface, #fff); }
.side-slot-label {
  font-size: 10px; color: var(--dm-muted, #5b6478); text-align: center;
  display: flex; align-items: center; justify-content: center; gap: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.side-slot .gallery-remove { top: 3px; right: 3px; }
@media (max-width: 640px) {
  .side-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.side-bg-toggle { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--dm-text-2, #475569); text-transform: none; letter-spacing: 0; cursor: pointer; }
.side-bg-btn {
  position: absolute; top: 4px; left: 4px; width: 22px; height: 22px; border-radius: 50%;
  border: none; background: rgba(255, 255, 255, 0.92); color: #7c3aed; cursor: pointer;
  display: grid; place-items: center; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.side-slot-drop { position: relative; }
.side-bg-pending {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 2px 0; text-align: center;
  font-size: 9.5px; font-weight: 600; color: #fff; background: rgba(124, 58, 237, 0.85);
}
.side-bg-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
