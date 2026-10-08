<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
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

const CUSTOMERS = ['ADM KAP', 'ADM SAP', 'HMMI', 'TMMIN', 'MKM', 'MMKI'] as const;

const resolveCustomer = (id_label: string | null | undefined): string | null => {
  if (!id_label) return null;
  const val = id_label.trim();
  if (!val) return null;
  if (val.includes('MAJMKM')) return 'MKM';
  if (val.includes('HAXQ'))   return 'HMMI';
  if (val.includes('KBN'))    return 'TMMIN';
  if (val.includes('DN5'))    return 'ADM KAP';
  if (val.includes('DN4'))    return 'ADM SAP';
  if (/^\d+$/.test(val))      return 'MMKI';
  return null;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const activePallets = computed(() =>
  dataTable.value.filter(p => p.is_active === '1')
);

const customerDataMap = computed(() => {
  const map = new Map<string, Map<string, { in: number; out: number }>>();
  CUSTOMERS.forEach(c => map.set(c, new Map()));

  activePallets.value.forEach(pallet => {
    const customer = resolveCustomer(pallet.id_label);
    if (!customer || !map.has(customer)) return;

    const typeMap = map.get(customer)!;
    const type    = pallet.type?.trim() || '-';

    if (!typeMap.has(type)) typeMap.set(type, { in: 0, out: 0 });
    const entry = typeMap.get(type)!;
    if (pallet.status === 'IN')  entry.in++;
    if (pallet.status === 'OUT') entry.out++;
  });

  return map;
});

const getCustomerRows = (customer: string) => {
  const typeMap = customerDataMap.value.get(customer);
  if (!typeMap) return [];
  return Array.from(typeMap.entries())
    .map(([type, counts]) => ({ type, ...counts }))
    .sort((a, b) => (b.in + b.out) - (a.in + a.out));
};

const getCustomerTotal = (customer: string, status: 'IN' | 'OUT') =>
  getCustomerRows(customer).reduce(
    (acc, r) => acc + (status === 'IN' ? r.in : r.out), 0
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
          <h1 class="page-title">MONITORING IN / OUT PALLET</h1>
        </div> 
          <div class="datetime-display">
            <span class="dt-date">{{ currentDate }}</span>
            <span class="dt-sep">|</span>
            <span class="dt-time">{{ currentTime }}</span>
          </div>
    </div>

    <div class="cards-section">
      <div class="cards-grid">
        <div v-for="(customer, ci) in CUSTOMERS" :key="customer" class="customer-card">

          <div class="card-header">
            <div class="card-name">{{ customer }}</div>
            <div class="card-totals">
              <span class="badge-in">IN : {{ getCustomerTotal(customer, 'IN') }}</span>
              <span class="badge-out">OUT : {{ getCustomerTotal(customer, 'OUT') }}</span>            </div>
          </div>

          <div class="card-table-wrap" >
            <table class="card-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th class="th-in">IN</th>
                  <th class="th-out">OUT</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in getCustomerRows(customer)" :key="idx" class="card-table-row">
                  <td class="td-type">{{ row.type }}</td>
                  <td class="td-in">{{ row.in }}</td>
                  <td class="td-out">{{ row.out }}</td>
                </tr>
                <tr v-if="getCustomerRows(customer).length === 0">
                  <td colspan="3" class="td-empty">— Tidak ada data —</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
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
  min-height: 100vh;
  background: var(--bg);
  color: var(--text-1);
  font-family: 'DM Mono', 'Fira Code', ui-monospace, monospace;
  padding: 0 1.5rem 3rem;
  overflow-x: hidden;
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
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 0 0;
}

.toolbar-left {
  display: flex; align-items: center;
}

.toolbar-logo {
  height: 92px;
  width: auto;
  object-fit: contain;
  border-radius: 8px;
}

.datetime-display {
  display: flex; align-items: center; gap: 0.5rem;
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
  display: flex; justify-content: center; align-items: center;
  padding: 1.5rem 0 1.75rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
}
.page-title {
  font-size: clamp(1.75rem, 3vw, 2.75rem);
  font-weight: 800; 
  color: #ffffff; margin: 0; line-height: 1;
  text-align: center; text-transform: uppercase;
}

.cards-section {
  position: relative; z-index: 10;
  margin-bottom: 1.5rem;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
}
@media (max-width: 1280px) { .cards-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px)  { .cards-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .cards-grid { grid-template-columns: 1fr; } }

.customer-card {
  background: var(--bg-card);
  border: 1px solid var(--blue-border);
  border-top: 3px solid var(--blue);
  border-radius: 12px; overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.card-header {
  display: flex;
  justify-content: space-between; 
  align-items: flex-start; 
  padding: 0.7rem 0.85rem;
  background: var(--blue-dim);
  border-bottom: 1px solid var(--blue-border);
}
.card-name {
  font-size: 2.0rem; font-weight: 700;
  letter-spacing: 0.07em; color: #ffffff; text-transform: uppercase;
}
.card-totals { 
  display: flex;
  flex-direction: column; 
  align-items: flex-end; 
  gap: 0.2rem;
 }
.badge-in, .badge-out {
  font-size: 0.95rem; font-weight: 600;
  padding: 0.15rem 0.5rem; border-radius: 5px;
  min-width: 80px;text-align: right;
}
.badge-in  { background: var(--green-dim); color: var(--green); }
.badge-out { background: var(--red-dim);   color: var(--red); }

.card-table-wrap {
  max-height: calc(100vh - 250px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.card-table-wrap::-webkit-scrollbar { display: none; }

.card-table { width: 100%; border-collapse: collapse; font-size: 1.0rem; }
.card-table thead tr { position: sticky; top: 0; z-index: 2; background: var(--bg-th); }
.card-table th {
  padding: 0.5rem 0.7rem; text-align: left;
  font-size: 1.5rem; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-1); border-bottom: 1px solid var(--blue-border);
}
.th-in  { text-align: center; color: #4ade80; }
.th-out { text-align: center; color: #fb7185; }

.card-table-row:hover { background: rgba(59,130,246,0.05); }
.card-table td {
  padding: 0.45rem 0.7rem;
  border-bottom: 1px solid rgba(255,255,255,0.045);
  color: var(--text-1);
}
.td-type { color: var(--text-1); font-weight: 500; font-size: 1.5rem; }
.td-in   { text-align: center; font-weight: 700; color: var(--green); font-size: 1.5rem; }
.td-out  { text-align: center; font-weight: 700; color: var(--red);   font-size: 1.5rem; }
.td-empty { text-align: center; padding: 1.2rem; color: var(--text-1); font-size: 1.5rem; }

.last-scan-section {
  position: relative; z-index: 10;
  display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem;
}
@media (max-width: 900px) { .last-scan-section { grid-template-columns: 1fr; } }

</style>