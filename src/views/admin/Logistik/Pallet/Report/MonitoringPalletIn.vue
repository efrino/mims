<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCombineStore } from '@/stores/Logistik/MasterData/CombinePallet';
import { storeToRefs } from 'pinia';
import socket from '@/plugins/socket';


const combineStore = useCombineStore();
const { dataTable } = storeToRefs(combineStore);

const loading     = ref(false);
const currentDate = ref('');
const currentTime = ref('');

const updateClock = () => {
  const now = new Date();
  currentDate.value = now.toLocaleDateString('id-ID', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
  currentTime.value = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const activePallets = computed(() =>
  dataTable.value.filter(p => p.is_active === '1')
);

const scanInPallets = computed(() =>
  activePallets.value.filter(p => p.status === 'IN')
);

const typeSummary = computed(() => {
  const map = new Map<string, number>();

  scanInPallets.value.forEach(pallet => {
    const type = pallet.type?.trim() || '-';
    map.set(type, (map.get(type) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total);
});

const totalScanIn = computed(() =>
  typeSummary.value.reduce((acc, r) => acc + r.total, 0)
);

const socketConnected = ref(socket.connected);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let clockId: ReturnType<typeof setInterval>;

const onPalletUpdate = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { combineStore.fetchMasterPallet(); }, 800);
};
const onSocketConnect    = () => { socketConnected.value = true; };
const onSocketDisconnect = () => { socketConnected.value = false; };

onMounted(() => {
  updateClock();
  clockId = setInterval(updateClock, 1000);
  combineStore.fetchMasterPallet();
  socket.on('connect',            onSocketConnect);
  socket.on('disconnect',         onSocketDisconnect);
  socket.on('refreshDataMonitor', onPalletUpdate);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  socket.off('connect',            onSocketConnect);
  socket.off('disconnect',         onSocketDisconnect);
  socket.off('refreshDataMonitor', onPalletUpdate);
  clearInterval(clockId);
});
</script>

<template>
  <div class="monitoring-wrapper">

    <div class="bg-grid"></div>

    <div class="toolbar">
      <div class="toolbar-left">
        <img src="@/assets/images/MAJ-LOGO-3.png" alt="Logo" class="toolbar-logo" />
       </div>
        <div class="title-block">
          <h1 class="page-title">MONITORING IN PALLET</h1>
        </div> 
          <div class="datetime-display">
            <span class="dt-date">{{ currentDate }}</span>
            <span class="dt-sep">|</span>
            <span class="dt-time">{{ currentTime }}</span>
          </div>
    </div>

    <div class="summary-section">

      <div class="total-panel">
        <div class="total-panel-header">IN PALLET</div>
        <div class="total-body">
          <div class="total-value">{{ totalScanIn }}</div>
        </div>
      </div>

      <div class="type-panel">
        <div class="type-panel-header">TIPE PALLET</div>
        <div v-if="typeSummary.length > 0" class="type-grid">
          <div v-for="row in typeSummary" :key="row.type" class="type-item">
            <span class="type-code">{{ row.type }}</span>
            <span class="type-total">{{ row.total }}</span>
          </div>
        </div>
        <div v-else class="type-empty">— Tidak ada data —</div>
      </div>

    </div>


  </div>
</template>

<style scoped>
.monitoring-wrapper {
  --bg:           #0c0e14;
  --bg-card:      #111827;
  --bg-th:        #0f172a;
  --border:       rgba(255,255,255,0.08);
  --border-hi:    rgba(255,255,255,0.16);
  --text-1:       #f1f5f9;
  --text-2:       #94a3b8;
  --text-3:       #4b5a70;
  --blue:         #3b82f6;
  --blue-dim:     rgba(59,130,246,0.14);
  --blue-border:  rgba(59,130,246,0.35);
  --green:        #22c55e;
  --green-dim:    rgba(34,197,94,0.12);
  --green-border: rgba(34,197,94,0.35);
  --red:          #f43f5e;
  --red-dim:      rgba(244,63,94,0.12);
  --red-border:   rgba(244,63,94,0.35);

  position: relative;
  height: 100vh;
  display: flex; flex-direction: column;
  background: var(--bg);
  color: var(--text-1);
  font-family: 'DM Mono', 'Fira Code', ui-monospace, monospace;
  padding: 0 1.5rem 1.5rem;
  overflow: hidden;
}

.bg-grid {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
}

.toolbar {
  position: relative; z-index: 10;
  flex: 0 0 auto;
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
  gap: 0.75rem;
  padding: 1rem 0 0;
}

.toolbar-left {
  display: flex; align-items: center;
  flex: 0 0 auto;
}

.toolbar-logo {
  height: 92px;
  width: auto;
  object-fit: contain;
  border-radius: 8px;
}

.datetime-display {
  display: flex; align-items: center; gap: 0.5rem;
  flex: 0 0 auto;
  padding: 0.45rem 1rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-hi);
  border-radius: 8px;
  font-size: 1.5rem;
  font-family: inherit;
}
.dt-date { color: var(--text-1); letter-spacing: 0.03em; }
.dt-sep  { color: var(--text-3); }
.dt-time {
  color: var(--text-1); font-weight: 600;
  font-variant-numeric: tabular-nums; letter-spacing: 0.06em;
}

.socket-status {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem; font-weight: 600; letter-spacing: 0.05em;
  border: 1px solid;
}
.socket-on  { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.4); color: #4ade80; }
.socket-off { background: rgba(239,68,68,0.12);  border-color: rgba(239,68,68,0.4);  color: #f87171; }
.socket-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: currentColor;
  animation: none;
}
.socket-on .socket-dot { animation: pulse-green 1.5s infinite; }
@keyframes pulse-green {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.title-block {
  position: relative; z-index: 10;
  flex: 1 1 auto; min-width: 0;
  display: flex; justify-content: center; align-items: center;
  padding: 1.5rem 0 1.75rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
}
.page-title {
  font-size: clamp(1.75rem, 3vw, 2.75rem);
  font-weight: 700; 
  color: #ffffff; margin: 0; line-height: 1;
  text-align: center; text-transform: uppercase;
}

.summary-section {
  position: relative; z-index: 10;
  flex: 1 1 auto; min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 2.2fr;
  gap: 1rem;
  align-items: stretch;
}
@media (max-width: 1024px) { .summary-section { grid-template-columns: 1fr; grid-auto-rows: 1fr; } }

.total-panel {
  background: var(--bg-card);
  border: 1px solid var(--blue-border);
  border-top: 3px solid var(--blue);
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
  min-height: 0;
}
.total-body {
  flex: 1 1 auto; min-height: 0;
  display: flex; justify-content: center; align-items: center;
  padding: 1rem;
}
.total-value {
  font-size: clamp(4rem, 11vw, 9rem);
  font-weight: 700; color: var(--blue);
  line-height: 1; font-variant-numeric: tabular-nums;
}

.type-panel {
  background: var(--bg-card);
  border: 1px solid var(--blue-border);
  border-top: 3px solid var(--blue);
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
  min-height: 0;
}
.total-panel-header,
.type-panel-header {
  flex: 0 0 auto;
  background: var(--blue-border);
  border-bottom: 1px solid var(--blue-border);
  padding: 0.75rem 1rem;
  font-size: 1.5rem; font-weight: 700;
  letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--text-1); text-align: center;
}
.type-grid {
  /* Ukuran kartu TETAP (bukan menyusut mengikuti jumlah tipe) - kalau
     tipe-nya banyak (mis. 51 dari master ms_pallet), panel INI yang
     scroll (scrollbar disembunyikan spy rapi di TV, tapi tetap bisa
     discroll), bukan tulisannya yang mengecil sampai susah dibaca. */
  flex: 1 1 auto; min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  grid-auto-rows: 140px;
  align-content: start;
  gap: 0.6rem;
  padding: 1rem;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.type-grid::-webkit-scrollbar { display: none; }

.type-item {
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  gap: 4px;
  padding: 8px 10px;
  background: var(--blue-dim);
  border: 1px solid var(--blue-border);
  border-radius: 8px;
  min-width: 0; min-height: 0;
  overflow: hidden;
}
.type-code {
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis;
  font-size: 1.3rem;
  font-weight: 700; color: var(--blue);
  letter-spacing: 0.03em; text-transform: uppercase;
  white-space: nowrap;
  line-height: 1.1;
}
.type-total {
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis;
  line-height: 1.1;
  font-size: 2.4rem;
  font-weight: 700; color: var(--text-1);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.type-empty {
  flex: 1 1 auto; min-height: 0;
  display: flex; justify-content: center; align-items: center;
  text-align: center;
  font-size: 1.2rem; color: var(--text-3);
}
</style>