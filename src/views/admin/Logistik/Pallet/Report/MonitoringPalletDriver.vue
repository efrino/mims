<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useLogsPalletService } from '@/services/Logistik/Pallet/logsPalletService';
import socket from '@/plugins/socket';
import type { CombinePalletDeliveryItem, DeliveryCycleItem } from '@/types/Logistik/Pallet/logsPallet';

const service = useLogsPalletService();

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

const outPallets     = ref<CombinePalletDeliveryItem[]>([]);
const deliveryCycles = ref<DeliveryCycleItem[]>([]);

const GROUP1_ORDER = ['ADM PLANT 1', 'ADM PLANT 4', 'ADM PLANT 5', 'TMMIN', 'GAYA MOTOR'];
const GROUP1_LABEL = ['DN4', 'DN5', 'KBN'];
function isGroup1(p: CombinePalletDeliveryItem): boolean {
  const name = p.customer_sap || p.source || '';
  if (GROUP1_ORDER.includes(name)) return true;

  const label = (p.id_label ?? '').trim();
  if (!label) return false;
  return GROUP1_LABEL.some((prefix) => label.includes(prefix));
}

async function loadAll() {
  loading.value = true;
  try {
    const [pallets, cycles] = await Promise.all([
      service.getCombineDelivery({ status: 'OUT' }),
      service.getDeliveryCycles({ group: 1 }),
    ]);
    outPallets.value     = pallets;
    deliveryCycles.value = cycles;
  } finally {
    loading.value = false;
  }
}

const group1Pallets = computed(() => outPallets.value.filter(isGroup1));

const totalDrivers = computed(() =>
  new Set(group1Pallets.value.map((p) => p.nama_driver).filter(Boolean)).size
);
const cycleKey = (customer: string, cycle: string) => `${customer}::${cycle}`;

const cycleTargetMap = computed(() => {
  const map = new Map<string, DeliveryCycleItem>();
  deliveryCycles.value.forEach((c) => map.set(cycleKey(c.customer, c.cycle), c));
  return map;
});

const isCycleConfirmed = (p: CombinePalletDeliveryItem): boolean => p.cycle_source === 'label';

interface DriverCard {
  key: string;
  driverName: string;
  hasDriver: boolean;
  nik: string;
  noPolisi: string;
  palletCount: number;
  itemTotal: number;
  cycleLabel: string;
  routeLabel: string;
  isComplete: boolean;
}

function buildDriverCards(): DriverCard[] {
  const byDriver = new Map<string, CombinePalletDeliveryItem[]>();
  for (const p of group1Pallets.value) {
    const key = p.nama_driver ? p.nama_driver : '__NODRIVER__';
    if (!byDriver.has(key)) byDriver.set(key, []);
    byDriver.get(key)!.push(p);
  }

  const cards: DriverCard[] = [];
  for (const [key, items] of byDriver) {
    const hasDriver = key !== '__NODRIVER__';

    const customers = [...new Set(
      items.map((p) => p.customer_sap || p.source).filter((c): c is string => Boolean(c))
    )];
    const cycles = [...new Set(
      items.map((p) => p.cycle).filter((c): c is string => Boolean(c))
    )];

    const consistent   = hasDriver && customers.length === 1 && cycles.length === 1;
    const allConfirmed = items.every(isCycleConfirmed);
    const target        = consistent ? cycleTargetMap.value.get(cycleKey(customers[0]!, cycles[0]!)) : undefined;
    const itemTotal      = target ? Number(target.item_total) : 0;
    const isComplete     = consistent && allConfirmed && itemTotal > 0 && items.length >= itemTotal;

    const cycleLabel = cycles.length ? cycles.map((c) => `C${c}`).join(', ') : '-';
    const routeLabel = [...new Set(
      items.map((p) => p.route_name || p.plant_name).filter((r): r is string => Boolean(r))
    )].join(', ') || '-';

    const nik      = items.find((p) => p.nik)?.nik || '-';
    const noPolisi = items.find((p) => p.no_polisi)?.no_polisi || '-';

    cards.push({
      key,
      driverName: hasDriver ? key : 'BELUM ADA DRIVER',
      hasDriver,
      nik,
      noPolisi,
      palletCount: items.length,
      itemTotal,
      cycleLabel,
      routeLabel,
      isComplete,
    });
  }

  return cards.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    if (a.hasDriver !== b.hasDriver) return a.hasDriver ? -1 : 1;
    return b.palletCount - a.palletCount;
  });
}

const driverCards      = computed(() => buildDriverCards());
const completedDrivers = computed(() => driverCards.value.filter((c) => c.isComplete).length);

const socketConnected = ref(socket.connected);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let clockId: ReturnType<typeof setInterval>;

const onPalletUpdate = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadAll, 800);
};
const onSocketConnect    = () => { socketConnected.value = true; };
const onSocketDisconnect = () => { socketConnected.value = false; };

onMounted(() => {
  updateClock();
  clockId = setInterval(updateClock, 1000);
  loadAll();
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
        <h1 class="page-title">MONITORING PALLET DRIVER</h1>
      </div>
      <div class="toolbar-right">
        <div class="mini-stats">
          <div class="mini-stat"><span class="mini-stat-value">{{ totalDrivers }}</span><span class="mini-stat-label">Driver</span></div>
          <div class="mini-stat mini-stat-complete"><span class="mini-stat-value">{{ completedDrivers }}</span><span class="mini-stat-label">Selesai</span></div>
        </div>
        <div class="datetime-display">
          <span class="dt-date">{{ currentDate }}</span>
          <span class="dt-sep">|</span>
          <span class="dt-time">{{ currentTime }}</span>
        </div>
      </div>
    </div>

    <div class="driver-board">
      <div v-if="driverCards.length > 0" class="driver-grid">
        <div
          v-for="card in driverCards" :key="card.key"
          class="driver-card"
          :class="{ 'driver-card-complete': card.isComplete }"
        >
          <div class="card-row card-row-top">
            <i class="mdi mdi-account-circle card-icon"></i>
            <span class="card-driver-name">{{ card.driverName }}</span>
            <span class="card-nik">{{ card.nik }}</span>
          </div>

          <div class="card-ratio">
            <span class="card-ratio-scanned">{{ card.palletCount }}</span>
            <span class="card-ratio-sep">/</span>
            <span class="card-ratio-target">{{ card.itemTotal || '-' }}</span>
          </div>

          <div class="card-row card-row-bottom">
            <i class="mdi mdi-truck-delivery card-icon"></i>
            <span class="card-route">{{ card.cycleLabel }} · {{ card.routeLabel }}</span>
          </div>
          <div class="card-row card-row-plate">
            <i class="mdi mdi-card-text-outline card-icon"></i>
            <span class="card-plate">{{ card.noPolisi }}</span>
          </div>
        </div>
      </div>
      <div v-else class="driver-board-empty">— Belum ada pallet OUT yang discan —</div>
    </div>

  </div>
</template>

<style scoped>
.monitoring-wrapper {
  --bg:           #0b0d12;
  --bg-card:      #131722;
  --border:       rgba(255,255,255,0.08);
  --border-hi:    rgba(255,255,255,0.16);
  --text-1:       #f1f5f9;
  --text-2:       #94a3b8;
  --text-3:       #4b5a70;
  --green:        #22c55e;
  --green-dim:    rgba(34,197,94,0.14);
  --green-border: rgba(34,197,94,0.45);
  --red:          #f43f5e;
  --red-dim:      rgba(244,63,94,0.14);
  --red-border:   rgba(244,63,94,0.45);

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
    linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
}

.toolbar {
  position: relative; z-index: 10;
  flex: 0 0 auto;
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 0 0;
  gap: 1rem;
}
.toolbar-left { display: flex; align-items: center; }
.toolbar-logo { height: 72px; width: auto; object-fit: contain; border-radius: 8px; }

.title-block { flex: 1; text-align: center; }
.page-title {
  font-size: clamp(1.5rem, 2.6vw, 2.4rem);
  font-weight: 700; color: #ffffff; margin: 0; line-height: 1;
  text-transform: uppercase;
}

.toolbar-right { display: flex; align-items: center; gap: 1rem; }

.mini-stats { display: flex; gap: 0.75rem; }
.mini-stat {
  display: flex; flex-direction: column; align-items: center;
  padding: 0.4rem 0.9rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-hi);
  border-radius: 8px;
  min-width: 84px;
}
.mini-stat-value { font-size: 1.4rem; font-weight: 700; color: var(--text-1); line-height: 1.1; font-variant-numeric: tabular-nums; }
.mini-stat-label  { font-size: 0.65rem; color: var(--text-2); letter-spacing: 0.06em; text-transform: uppercase; }
.mini-stat-complete .mini-stat-value { color: var(--green); }

.datetime-display {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.45rem 1rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-hi);
  border-radius: 8px;
  font-size: 1.1rem;
  font-family: inherit;
}
.dt-date { color: var(--text-1); letter-spacing: 0.03em; }
.dt-sep  { color: var(--text-3); }
.dt-time { color: var(--text-1); font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: 0.06em; }

.driver-board {
  position: relative; z-index: 10;
  flex: 1 1 auto; min-height: 0;
  margin-top: 1.25rem;
}

.driver-grid {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  grid-auto-rows: 196px;
  align-content: start;
  gap: 1rem;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.driver-grid::-webkit-scrollbar { display: none; }

.driver-board-empty {
  height: 100%;
  display: flex; justify-content: center; align-items: center;
  font-size: 1.1rem; color: var(--text-3);
}

.driver-card {
  display: flex; flex-direction: column; justify-content: space-between;
  gap: 0.3rem;
  padding: 0.9rem 1rem;
  background: var(--red-dim);
  border: 1px solid var(--red-border);
  border-top: 3px solid var(--red);
  border-radius: 12px;
  min-width: 0; min-height: 0;
  overflow: hidden;
}

.driver-card-complete {
  background: var(--green-dim);
  border-color: var(--green-border);
  border-top-color: var(--green);
}

.card-row {
  display: flex; align-items: center; gap: 0.4rem;
  min-width: 0;
}
.card-icon { font-size: 1.15rem; color: var(--red); flex: 0 0 auto; }
.driver-card-complete .card-icon { color: var(--green); }

.card-driver-name {
  flex: 1 1 auto; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 1rem; font-weight: 700;
  letter-spacing: 0.02em; text-transform: uppercase;
  color: var(--text-1);
}

.card-nik {
  flex: 0 0 auto;
  font-size: 0.7rem; font-weight: 700; color: var(--text-1);
  background: rgba(255,255,255,0.1);
  padding: 1px 6px; border-radius: 4px;
  white-space: nowrap;
}

.card-ratio {
  display: flex; justify-content: center; align-items: baseline; gap: 0.2rem;
  line-height: 1;
}
.card-ratio-scanned {
  font-size: 2.3rem; font-weight: 700; color: var(--red);
  font-variant-numeric: tabular-nums;
}
.driver-card-complete .card-ratio-scanned { color: var(--green); }
.card-ratio-sep    { font-size: 1.3rem; color: var(--text-1); font-weight: 700; }
.card-ratio-target {
  font-size: 1.3rem; font-weight: 700; color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.card-route, .card-plate {
  flex: 1 1 auto; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 0.78rem; font-weight: 700; color: var(--text-1);
}

@media (max-width: 900px) {
  .toolbar { flex-wrap: wrap; }
}
</style>
