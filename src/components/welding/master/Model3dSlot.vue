<!-- components/welding/master/Model3dSlot.vue
  Slot "Model 3D (utama)" di form Edit → Media Part / Pallet. File .glb dari user jadi tampilan
  utama di Spesifikasi Part (foto 6 sisi jadi fallback). Cover kosong → diisi snapshot model. -->
<template>
  <div class="m3s">
    <div class="m3s-icon" :class="{ 'm3s-icon--on': hasModel }"><i class="mdi mdi-cube-scan"></i></div>
    <div class="m3s-info">
      <span class="m3s-label">Model 3D <span class="hint">(utama · .glb maks 40 MB — tanpa model, foto 6 sisi yg dipakai)</span></span>
      <span class="m3s-sub">
        <template v-if="busy">{{ busy }}</template>
        <template v-else-if="model && !model.file_path">Sedang dibuat dari foto (TripoSR)…</template>
        <template v-else-if="hasModel">{{ model!.updated_by === 'triposr' ? 'Hasil otomatis dari foto' : 'Upload user' }} · {{ fileName }}</template>
        <template v-else>Belum ada model 3D</template>
      </span>
    </div>
    <label class="m3s-btn" :class="{ 'm3s-btn--busy': !!busy }">
      <i class="mdi" :class="busy ? 'mdi-loading mdi-spin' : 'mdi-upload'"></i> {{ hasModel ? 'Ganti .glb' : 'Upload .glb' }}
      <input type="file" accept=".glb,model/gltf-binary" hidden :disabled="!!busy || disabled" @change="onPick" />
    </label>
    <button v-if="model" type="button" class="m3s-btn m3s-btn--danger" :disabled="!!busy || disabled" title="Hapus model 3D" @click="remove">
      <i class="mdi mdi-delete-outline"></i> Hapus
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import type { MsWeldingMedia } from '@/types/Public/Welding/master';
import { confirmDialog } from '@/utils/dialog';

const props = defineProps<{ partId: number; kind: 'part' | 'pallet'; hasCover: boolean; disabled?: boolean }>();
const emit = defineEmits<{ changed: []; coverSet: [path: string]; error: [message: string] }>();
const model = ref<MsWeldingMedia | null>(null);
const busy = ref<string | null>(null);
const hasModel = computed(() => !!model.value?.file_path);
const fileName = computed(() => (model.value?.file_path ?? '').split('/').pop());

async function load() {
  model.value = await masterService.getModel(props.partId, props.kind).catch(() => null);
}
watch(() => [props.partId, props.kind], load, { immediate: true });

// Snapshot model (render <model-viewer> tersembunyi) → PNG utk cover. Tanpa WebGL → null.
async function snapshot(file: File): Promise<Blob | null> {
  await import('@google/model-viewer');
  const url = URL.createObjectURL(file);
  const el = document.createElement('model-viewer') as any;
  el.setAttribute('loading', 'eager');   // default lazy: tak memuat sebelum terlihat (IntersectionObserver)
  el.setAttribute('reveal', 'auto');
  el.setAttribute('src', url);
  el.setAttribute('environment-image', 'neutral');
  el.setAttribute('shadow-intensity', '0.9');
  el.setAttribute('camera-orbit', '30deg 70deg auto');
  // Harus di dalam viewport (bukan left:-10000px) supaya dirender; dibuat tak terlihat.
  el.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:640px;opacity:0;pointer-events:none;z-index:-1;';
  document.body.appendChild(el);
  try {
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout')), 20000);
      el.addEventListener('load', () => { clearTimeout(t); res(); }, { once: true });
      el.addEventListener('error', () => { clearTimeout(t); rej(new Error('error')); }, { once: true });
    });
    await new Promise(r => setTimeout(r, 400));   // tunggu frame pertama tergambar
    return await el.toBlob({ mimeType: 'image/png', idealAspect: true });
  } catch { return null; } finally { el.remove(); URL.revokeObjectURL(url); }
}

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.glb')) { emit('error', 'Pilih file .glb (glTF biner).'); return; }
  if (file.size > 40 * 1024 * 1024) { emit('error', 'Ukuran model maksimal 40 MB.'); return; }
  if (model.value?.file_path && model.value.updated_by === 'triposr'
    && !await confirmDialog('Ganti model 3D hasil otomatis dengan file ini?')) return;
  busy.value = 'Mengupload model…';
  try {
    const r = await masterService.uploadModel3d(props.partId, props.kind, file);
    if (!r.success) { emit('error', r.message); return; }
    await load();
    emit('changed');
    if (!props.hasCover) {
      busy.value = 'Membuat cover dari model…';
      const blob = await snapshot(file);
      if (blob) {
        const img = new File([blob], `cover_3d_${props.partId}.png`, { type: 'image/png' });
        const c = props.kind === 'pallet' ? await masterService.uploadPalletImage(props.partId, img) : await masterService.uploadImage(props.partId, img);
        const path = (c as any).pallet_image ?? (c as any).image;
        if (path) emit('coverSet', path);
      }
    }
  } catch (err: any) {
    emit('error', err?.response?.data?.message ?? err?.message ?? 'Gagal upload model 3D.');
  } finally { busy.value = null; }
}

async function remove() {
  if (!model.value || !await confirmDialog('Hapus model 3D? Tampilan kembali ke foto 6 sisi.')) return;
  busy.value = 'Menghapus…';
  try {
    const r = await masterService.deleteMedia(model.value.id);
    if (!r.success) { emit('error', r.message); return; }
    model.value = null;
    emit('changed');
  } catch (err: any) {
    emit('error', err?.response?.data?.message ?? 'Gagal menghapus model 3D.');
  } finally { busy.value = null; }
}
</script>

<style scoped>
.m3s { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 10px; border-radius: 10px;
  border: 1px solid var(--dm-border, #e2e8f0); background: var(--dm-surface, #fff); }
.m3s-icon { flex-shrink: 0; width: 44px; height: 44px; border-radius: 8px; display: grid; place-items: center; font-size: 24px;
  background: var(--dm-surface2, #f1f5f9); color: var(--dm-muted, #94a3b8); }
.m3s-icon--on { background: var(--dm-tint-violet, #ede9fe); color: #7c3aed; }
.m3s-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.m3s-label { font-weight: 700; font-size: 13px; color: var(--dm-text, #1e293b); }
.m3s-label .hint { font-weight: 400; font-size: 11px; color: var(--dm-muted, #64748b); }
.m3s-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
  border: 1px solid #4472c4; color: var(--dm-accent, #2e5396); background: transparent; transition: background .15s; }
.m3s-btn:hover:not(:disabled) { background: var(--dm-tint-blue, #eff6ff); }
.m3s-btn--busy, .m3s-btn:disabled { opacity: .6; cursor: wait; }
.m3s-btn--danger { color: var(--dm-on-red, #b91c1c); border-color: var(--dm-bd-red, #fecaca); background: var(--dm-tint-red, #fef2f2); }
.m3s-sub { font-size: 11.5px; color: var(--dm-muted, #64748b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
