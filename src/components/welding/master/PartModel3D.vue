<!-- components/welding/master/PartModel3D.vue
  Penampil model 3D (.glb hasil TripoSR) — <model-viewer> (Google, Apache-2.0).
  Part melayang naik-turun, berputar otomatis; saat di-drag putaran lanjut lagi
  segera setelah dilepas (auto-rotate-delay 0). Library dimuat saat pertama dipakai. -->
<template>
  <div class="m3d" :class="{ 'm3d--compact': compact }">
    <div class="m3d-float">
      <model-viewer
        v-if="ready"
        :src="src"
        :alt="alt"
        camera-controls
        auto-rotate
        auto-rotate-delay="0"
        rotation-per-second="24deg"
        interaction-prompt="none"
        shadow-intensity="0.9"
        shadow-softness="1"
        exposure="1.05"
        environment-image="neutral"
        disable-zoom
        touch-action="pan-y"
        class="m3d-viewer"
        @load="loaded = true"
        @error="onError"
      ></model-viewer>
    </div>
    <div v-if="!loaded && !failed" class="m3d-state"><i class="mdi mdi-loading mdi-spin"></i> Memuat 3D…</div>
    <div v-if="failed" class="m3d-state m3d-state--err"><i class="mdi mdi-cube-off-outline"></i> {{ failMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{ src: string; alt?: string; compact?: boolean }>(), { alt: 'model 3D part', compact: false });

const ready = ref(false);
const loaded = ref(false);
const failed = ref(false);
const failMsg = ref('Model 3D gagal dimuat');
const emit = defineEmits<{ unavailable: [reason: string] }>();

// Tanpa WebGL (hardware acceleration Chrome mati/diblokir, driver GPU) <model-viewer> tetap
// "loaded" tapi tak menggambar apa pun → kotak kosong. Deteksi dulu & beri tahu induk
// supaya kembali ke tampilan foto.
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
function fail(msg: string) {
  failed.value = true;
  failMsg.value = msg;
  emit('unavailable', msg);
}
function onError(e: Event) {
  const type = (e as CustomEvent).detail?.type;
  fail(type === 'webglcontextlost'
    ? 'Tampilan 3D terhenti (grafis browser hilang) — muat ulang halaman'
    : 'Model 3D gagal dimuat');
}

onMounted(async () => {
  if (!hasWebGL()) { fail('Browser tidak mendukung WebGL — aktifkan "Use graphics acceleration" di pengaturan Chrome'); return; }
  await import('@google/model-viewer');   // web component, didaftarkan sekali
  ready.value = true;
});
watch(() => props.src, () => { loaded.value = false; failed.value = false; });
</script>

<style scoped>
.m3d { position: relative; width: 100%; height: 100%; min-height: 150px; }
.m3d-float { position: absolute; inset: 0; animation: m3d-float 4.2s ease-in-out infinite; }
.m3d-viewer { width: 100%; height: 100%; background: transparent; --poster-color: transparent; outline: none; }
.m3d-state { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: var(--dm-muted, #64748b); pointer-events: none; }
.m3d-state--err { color: var(--dm-on-red, #b91c1c); }
@keyframes m3d-float { 0%, 100% { transform: translateY(-5px); } 50% { transform: translateY(5px); } }
@media (prefers-reduced-motion: reduce) { .m3d-float { animation: none; } }
</style>
