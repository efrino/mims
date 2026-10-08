<!-- components/welding/master/MajaAssistant.vue
  Asisten umum "Tanya MAJA" di halaman utama Master Data — tanpa konteks part.
  Tombol mengambang (kanan bawah) membuka panel chat; hanya tampil utk akun yg
  diizinkan (config ai_enabled / ai_users). Chat-nya sama dgn panel per part
  (MajaChat.vue), dgn saran pertanyaan lintas part (list_alerts, search_parts). -->
<template>
  <button v-if="allowed && !open" class="ea-fab" title="Tanya MAJA — asisten AI Master Data" @click="open = true">
    <span class="ea-fab-icon"><i class="mdi mdi-robot-happy-outline"></i></span>
    <span class="ea-fab-text">Tanya MAJA</span>
  </button>

  <Teleport to="body">
    <Transition name="ea-slide">
      <div v-if="open" v-modal-stack="() => (open = false)" class="ea-overlay" @click.self.prevent>
        <aside class="ea-drawer">
          <header class="ea-hero">
            <div class="ea-hero-icon"><i class="mdi mdi-robot-happy-outline"></i></div>
            <div class="ea-hero-text">
              <p class="ea-hero-title">MAJA</p>
              <p class="ea-hero-sub">Asisten AI Mekar Armada Jaya — tanya part, julukan, job number, stok, DN, planning</p>
            </div>
            <button class="ea-icon-btn" title="Tutup" @click="open = false"><i class="mdi mdi-close"></i></button>
          </header>
          <div class="ea-main" data-maja-scroll>
            <MajaChat :part-number="null" :suggestions="SUGGESTIONS" placeholder="Tanya MAJA: order hari ini, part mana yang…, julukan, job number…" part-link @open-part="pn => (insightPart = pn)" />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
  <!-- Klik nomor part di tabel jawaban → Info Cepat part (di atas panel MAJA) -->
  <PartInsightPanel :open="!!insightPart" :part-number="insightPart" @close="insightPart = null" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import masterService from '@/services/Public/Welding/masterService';
import { vModalStack } from '@/directives/modalStack';
import MajaChat from './MajaChat.vue';
import PartInsightPanel from './PartInsightPanel.vue';

const SUGGESTIONS = [
  { q: 'Part dengan DN tertinggi besok?', icon: 'mdi-truck-fast-outline' },
  { q: 'Part mana yang stoknya di bawah safety hari ini?', icon: 'mdi-shield-alert-outline' },
  { q: 'Part dengan achievement rendah bulan ini?', icon: 'mdi-chart-bar' },
  { q: 'Part julukan kecoak itu apa?', icon: 'mdi-magnify' },
];

const open = ref(false);
const insightPart = ref<string | null>(null);
const allowed = ref(false);

onMounted(() => {
  masterService.aiHealth().then(h => { allowed.value = h.enabled; }).catch(() => { allowed.value = false; });
});
</script>

<style scoped>
/* Ringkas (ikon saja) supaya tak menutupi pagination/aksi baris; label muncul saat hover/fokus. */
.ea-fab {
  position: fixed; right: 18px; bottom: 18px; z-index: 900;
  display: inline-flex; align-items: center; gap: 0; padding: 5px;
  border: none; border-radius: 999px; cursor: pointer; color: #fff; font-weight: 700; font-size: 13px;
  background: linear-gradient(135deg, #2e5396, #4472c4 60%, #d7263d);
  box-shadow: 0 8px 24px rgba(46, 83, 150, 0.35); transition: transform 0.15s, box-shadow 0.15s;
}
.ea-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(46, 83, 150, 0.45); }
.ea-fab-text { max-width: 0; overflow: hidden; white-space: nowrap; opacity: 0; transition: max-width .25s ease, opacity .2s ease, margin .25s ease; }
.ea-fab:hover .ea-fab-text, .ea-fab:focus-visible .ea-fab-text { max-width: 120px; opacity: 1; margin: 0 10px 0 8px; }
.ea-fab-icon { width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 255, 255, 0.18); display: grid; place-items: center; font-size: 20px; }

.ea-overlay { position: fixed; inset: 0; z-index: 99990; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); display: flex; justify-content: flex-end; }
.ea-drawer { width: min(820px, 100%); height: 100%; background: var(--dm-surface2, #f8fafc); display: flex; flex-direction: column; box-shadow: -16px 0 48px rgba(15, 23, 42, 0.25); }
.ea-hero { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 14px 16px; color: #fff; background: radial-gradient(120% 140% at 100% 0%, #4472c4 0%, #2e5396 55%, #1e3a70 100%); }
.ea-hero-icon { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 22px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(215, 38, 61, 0.45)); }
.ea-hero-text { flex: 1; min-width: 0; }
.ea-hero-title { margin: 0; font-size: 16px; font-weight: 800; }
.ea-hero-sub { margin: 1px 0 0; font-size: 11.5px; opacity: 0.85; }
.ea-icon-btn { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(255, 255, 255, 0.12); color: #fff; cursor: pointer; }
.ea-icon-btn:hover { background: rgba(255, 255, 255, 0.26); }

/* Chat mengisi panel; input menempel di bawah. */
.ea-main { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; padding: 14px 14px 0; }
.ea-main :deep(.ec-chat) { flex: 1; }
.ea-main :deep(.ec-footer) { position: sticky; bottom: 0; margin: 10px -14px 0; z-index: 2; }

.ea-slide-enter-active, .ea-slide-leave-active { transition: opacity 0.22s; }
.ea-slide-enter-active .ea-drawer, .ea-slide-leave-active .ea-drawer { transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1); }
.ea-slide-enter-from, .ea-slide-leave-to { opacity: 0; }
.ea-slide-enter-from .ea-drawer, .ea-slide-leave-to .ea-drawer { transform: translateX(60px); }
@media (max-width: 640px) { .ea-fab-text { display: none; } }
</style>
