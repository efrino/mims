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
const GROUP2_ORDER = ['HMMI', 'MMKI', 'MKM'];

const GROUP1_LABEL = ['DN4', 'DN5', 'KBN'];
const GROUP2_LABEL = ['MAJMKM', 'HAXQ'];

function groupOf(p: CombinePalletDeliveryItem): 1 | 2 | 0 {
  const name = p.customer_sap || p.source || '';
  if (GROUP1_ORDER.includes(name)) return 1;
  if (GROUP2_ORDER.includes(name)) return 2;

  const label = (p.id_label ?? '').trim();
  if (!label) return 0;
  if (GROUP1_LABEL.some((prefix) => label.includes(prefix))) return 1;
  if (GROUP2_LABEL.some((prefix) => label.includes(prefix))) return 2;
  if (/^\d+$/.test(label)) return 2;
  return 0;
}

async function loadAll() {
  loading.value = true;
  try {
    const [pallets, cyclesGroup1, cyclesGroup2] = await Promise.all([
      service.getCombineDelivery({ status: 'OUT' }),
      service.getDeliveryCycles({ group: 1 }),
      service.getDeliveryCycles({ group: 2 }),
    ]);
    outPallets.value     = pallets;
    deliveryCycles.value = [...cyclesGroup1, ...cyclesGroup2];
  } finally {
    loading.value = false;
  }
}

const cycleKey = (customer: string, cycle: string) => `${customer}::${cycle}`;

const cycleTargetMap = computed(() => {
  const map = new Map<string, DeliveryCycleItem>();
  deliveryCycles.value.forEach((c) => map.set(cycleKey(c.customer, c.cycle), c));
  return map;
});

// Cycle pasti kalau diambil dari nomor DN di label, atau (HMMI/MKM) dari jam
// keluar vs ETD. 'perkiraan' / kosong = tebakan, tidak dianggap sesuai.
const isCycleConfirmed = (p: CombinePalletDeliveryItem): boolean =>
  p.cycle_source === 'label' || p.cycle_source === 'jam_keluar';

interface DriverCard {
  key: string;
  driverName: string;
  hasDriver: boolean;
  palletCount: number;
  itemTotal: number;
  isComplete: boolean;
  meta: string;
}

function buildDriverCards(group: 1 | 2): DriverCard[] {
  const matching = outPallets.value.filter((p) => groupOf(p) === group);
  const byDriver = new Map<string, CombinePalletDeliveryItem[]>();
  for (const p of matching) {
    const key = p.nama_driver ? p.nama_driver : '__NODRIVER__';
    if (!byDriver.has(key)) byDriver.set(key, []);
    byDriver.get(key)!.push(p);
  }

  const cards: DriverCard[] = [];
  for (const [key, items] of byDriver) {
    const hasDriver = key !== '__NODRIVER__';
    const metaSet = [...new Set(
      items.map((p) => `${p.customer_sap || p.source || '-'} C${p.cycle ?? '-'}`)
    )];
    const customers = [...new Set(
      items.map((p) => p.customer_sap || p.source).filter((c): c is string => Boolean(c))
    )];
    const cycles = [...new Set(
      items.map((p) => p.cycle).filter((c): c is string => Boolean(c))
    )];

    // Hijau kalau satu (customer, cycle) konsisten, semua cycle pasti, dan
    // jumlah pallet >= item_total cycle itu (sama seperti Monitoring Pallet Driver).
    const consistent = hasDriver && customers.length === 1 && cycles.length === 1;
    const target     = consistent ? cycleTargetMap.value.get(cycleKey(customers[0]!, cycles[0]!)) : undefined;
    const itemTotal  = target ? Number(target.item_total) : 0;
    const isComplete = consistent && items.every(isCycleConfirmed) && itemTotal > 0 && items.length >= itemTotal;

    const noPolisi = items.find((p) => p.no_polisi)?.no_polisi;

    cards.push({
      key,
      driverName: hasDriver ? (noPolisi ? `${noPolisi} - ${key}` : key) : 'BELUM ADA DRIVER',
      hasDriver,
      palletCount: items.length,
      itemTotal,
      isComplete,
      meta: metaSet.join(', '),
    });
  }

  return cards.sort((a, b) => {
    if (a.hasDriver !== b.hasDriver) return a.hasDriver ? -1 : 1;
    return b.palletCount - a.palletCount;
  });
}

const group1DriverCards = computed(() => buildDriverCards(1));
const group2DriverCards = computed(() => buildDriverCards(2));

const scanTimeOf = (p: CombinePalletDeliveryItem): string =>
  p.log_created_at ?? p.updated_at ?? '';

function buildGroupPallets(group: 1 | 2): CombinePalletDeliveryItem[] {
  return outPallets.value
    .filter((p) => groupOf(p) === group)
    .sort((a, b) => scanTimeOf(b).localeCompare(scanTimeOf(a)));
}

const group1Pallets = computed(() => buildGroupPallets(1));
const group2Pallets = computed(() => buildGroupPallets(2));

const group1Total = computed(() => group1Pallets.value.length);
const group2Total = computed(() => group2Pallets.value.length);

const totalPalletOut = computed(() => outPallets.value.length);
const totalDrivers   = computed(() =>
  new Set(outPallets.value.map((p) => p.nama_driver).filter(Boolean)).size
);

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
        <h1 class="page-title">MONITORING OUT PALLET</h1>
      </div>
      <div class="toolbar-right">
        <div class="mini-stats">
          <div class="mini-stat"><span class="mini-stat-value">{{ totalPalletOut }}</span><span class="mini-stat-label">Pallet OUT</span></div>
          <div class="mini-stat"><span class="mini-stat-value">{{ totalDrivers }}</span><span class="mini-stat-label">Driver</span></div>
        </div>
        <div class="datetime-display">
          <span class="dt-date">{{ currentDate }}</span>
          <span class="dt-sep">|</span>
          <span class="dt-time">{{ currentTime }}</span>
        </div>
      </div>
    </div>

    <div class="groups-wrap">

      <section class="group-section">
        <div class="group-header">GROUP 1 — ADM / TMMIN / GAYA MOTOR</div>
        <div class="summary-section">
          <div class="total-panel">
            <div class="total-panel-header">PALLET OUT</div>
            <div class="total-body"><div class="total-value">{{ group1Total }}</div></div>
            <div class="rfid-list">
              <table v-if="group1Pallets.length" class="rfid-table">
                <thead>
                  <tr>
                    <th class="td-strong">RFID</th><th class="td-strong">Type</th><th class="td-strong">Driver</th><th class="td-strong">LP</th><th class="td-strong">No Polisi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in group1Pallets" :key="p.no_rfid">
                    <td class="td-rfid">{{ p.no_rfid }}</td>
                    <td class="td-strong">{{ p.type || '-' }}</td>
                    <td :class="p.nama_driver ? 'td-strong' : 'td-driver-empty'">{{ p.nama_driver || 'Belum discan' }}</td>
                    <td class="td-strong">{{ p.nama_lp || '-' }}</td>
                    <td class="td-strong">{{ p.no_polisi || '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="rfid-list-empty">— Belum ada RFID yang discan —</div>
            </div>
          </div>
          <div class="driver-panel">
            <div class="driver-panel-header">DRIVER</div>
            <div v-if="group1DriverCards.length > 0" class="driver-grid">
              <div
                v-for="card in group1DriverCards" :key="card.key"
                class="driver-item"
                :class="{ 'driver-item-empty': !card.hasDriver, 'driver-item-complete': card.isComplete }"
              >
                <span class="driver-name">{{ card.driverName }}</span>
                <span class="driver-count">{{ card.palletCount }}<span v-if="card.itemTotal" class="driver-count-target">/{{ card.itemTotal }}</span></span>
                <span class="driver-meta">{{ card.meta || '—' }}</span>
              </div>
            </div>
            <div v-else class="driver-empty">— Belum ada pallet OUT —</div>
          </div>
        </div>
      </section>

      <section class="group-section">
        <div class="group-header">GROUP 2 — HMMI / MMKI / MKM</div>
        <div class="summary-section">
          <div class="total-panel">
            <div class="total-panel-header">PALLET OUT</div>
            <div class="total-body"><div class="total-value">{{ group2Total }}</div></div>
            <div class="rfid-list">
              <table v-if="group2Pallets.length" class="rfid-table">
                <thead>
                  <tr>
                    <th class="td-strong">RFID</th><th class="td-strong">Type</th><th class="td-strong">Driver</th><th class="td-strong">LP</th><th class="td-strong">No Polisi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in group2Pallets" :key="p.no_rfid">
                    <td class="td-rfid">{{ p.no_rfid }}</td>
                    <td class="td-strong">{{ p.type || '-' }}</td>
                    <td :class="p.nama_driver ? 'td-strong' : 'td-driver-empty'">{{ p.nama_driver || 'Belum discan' }}</td>
                    <td class="td-strong">{{ p.nama_lp || '-' }}</td>
                    <td class="td-strong">{{ p.no_polisi || '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="rfid-list-empty">— Belum ada RFID yang discan —</div>
            </div>
          </div>
          <div class="driver-panel">
            <div class="driver-panel-header">DRIVER</div>
            <div v-if="group2DriverCards.length > 0" class="driver-grid">
              <div
                v-for="card in group2DriverCards" :key="card.key"
                class="driver-item"
                :class="{ 'driver-item-empty': !card.hasDriver, 'driver-item-complete': card.isComplete }"
              >
                <span class="driver-name">{{ card.driverName }}</span>
                <span class="driver-count">{{ card.palletCount }}<span v-if="card.itemTotal" class="driver-count-target">/{{ card.itemTotal }}</span></span>
                <span class="driver-meta">{{ card.meta || '—' }}</span>
              </div>
            </div>
            <div v-else class="driver-empty">— Belum ada pallet OUT —</div>
          </div>
        </div>
      </section>

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
  --amber:        #f59e0b;
  --amber-dim:    rgba(245,158,11,0.12);
  --amber-border: rgba(245,158,11,0.35);

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

.groups-wrap {
  position: relative; z-index: 10;
  flex: 1 1 auto; min-height: 0;
  display: flex; flex-direction: column; gap: 1.25rem;
  margin-top: 1.25rem;
}

.group-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
  flex: 1 1 0; min-height: 0;
}
.group-header {
  flex: 0 0 auto;
  padding: 0.6rem 1.1rem;
  font-size: 1.05rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-1);
  background: var(--red-dim);
  border-bottom: 1px solid var(--red-border);
}

.summary-section {
  flex: 1 1 auto; min-height: 0;
  display: grid;
  grid-template-columns: minmax(420px, 1.5fr) 2fr;
  gap: 1rem;
  padding: 1rem;
  align-items: stretch;
}
@media (max-width: 1100px) { .summary-section { grid-template-columns: 1fr; grid-auto-rows: 1fr; } }

.total-panel, .driver-panel {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--red-border);
  border-top: 3px solid var(--red);
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
  min-height: 0;
}
.total-panel-header, .driver-panel-header {
  flex: 0 0 auto;
  background: var(--red-border);
  border-bottom: 1px solid var(--red-border);
  padding: 0.6rem 1rem;
  font-size: 1.1rem; font-weight: 700;
  letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--text-1); text-align: center;
}
.total-body {
  flex: 0 0 auto;
  display: flex; justify-content: center; align-items: center;
  padding: 0.6rem;
  border-bottom: 1px solid var(--border);
}
.total-value {
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 700; color: var(--red);
  line-height: 1; font-variant-numeric: tabular-nums;
}

.rfid-list {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
  scrollbar-width: none;    /* Firefox */
  -ms-overflow-style: none; /* versi lama Edge/IE */
}
.rfid-list::-webkit-scrollbar { display: none; } /* Chrome/Safari/Edge baru */
.rfid-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 0.85rem; }
.rfid-table th:nth-child(1) { width: 34%; }
.rfid-table th:nth-child(2) { width: 9%; }
.rfid-table th:nth-child(3) { width: 15%; }
.rfid-table th:nth-child(4) { width: 19%; }
.rfid-table th:nth-child(5) { width: 11%; }
.rfid-table th:nth-child(6) { width: 12%; }
.rfid-table th {
  position: sticky; top: 0;
  text-align: left; padding: 0.4rem 0.5rem;
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--text-3); background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}
.rfid-table td {
  padding: 0.4rem 0.5rem;
  color: var(--text-2); font-weight: 600;
  border-bottom: 1px solid var(--border);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rfid-table tr:last-child td { border-bottom: none; }
.rfid-table .td-rfid { color: var(--text-1); font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.rfid-table .td-strong { color: var(--text-1); }
.rfid-table .td-driver-empty { color: var(--amber); font-style: italic; }
.rfid-list-empty {
  flex: 1 1 auto; min-height: 0;
  display: flex; justify-content: center; align-items: center;
  text-align: center; padding: 1rem;
  font-size: 0.85rem; color: var(--text-3);
}

.driver-grid {
  flex: 1 1 auto; min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  grid-auto-rows: 88px;
  align-content: start;
  gap: 0.5rem;
  padding: 1rem;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.driver-grid::-webkit-scrollbar { display: none; }
.driver-empty {
  flex: 1 1 auto; min-height: 0;
  display: flex; justify-content: center; align-items: center;
  text-align: center;
  font-size: 1rem; color: var(--text-3);
}

.driver-item {
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  gap: 3px;
  padding: 8px 10px;
  background: var(--red-dim);
  border: 1px solid var(--red-border);
  border-radius: 8px;
  min-width: 0; min-height: 0;
  overflow: hidden;
}
.driver-item-empty {
  background: var(--amber-dim);
  border-color: var(--amber-border);
}
.driver-name {
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis;
  font-size: 1.05rem;
  font-weight: 700; color: var(--red);
  letter-spacing: 0.02em; text-transform: uppercase;
  white-space: nowrap; line-height: 1.15;
}
.driver-item-empty .driver-name { color: var(--amber); }
.driver-item-complete {
  background: var(--green-dim);
  border-color: var(--green-border);
}
.driver-item-complete .driver-name { color: var(--green); }
.driver-count {
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis;
  line-height: 1.1;
  font-size: 1.9rem;
  font-weight: 700; color: var(--red);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.driver-item-complete .driver-count { color: var(--green); }
.driver-count-target { font-size: 1.2rem; color: var(--text-1); }
.driver-meta {
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
  color: var(--text-1); font-weight: 600;
  margin-top: 2px;
}

@media (max-width: 900px) {
  .toolbar { flex-wrap: wrap; }
}
</style>
