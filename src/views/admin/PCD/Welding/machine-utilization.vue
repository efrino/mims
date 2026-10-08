<!-- views/admin/PCD/Welding/machine-utilization.vue
     Dashboard grid utilisasi mesin (Aturan #7-lanjutan) — persentase TPT tiap
     mesin di 1 area/tanggal, terintegrasi langsung dengan jumlah plan_day/
     plan_night mutasi_weld (bukan data terpisah — begitu plan berubah &
     di-refresh, angka di sini ikut berubah). Klik kartu mesin untuk detail
     per-part (reuse MachineCompetitionModal, sama dengan yang dipakai modal
     edit plan).

     Buffer Mesin OFF (dulu halaman sendiri /pcd/welding/machine-off-buffer,
     sekarang digabung ke sini) ditaruh sebagai panel collapsible — satu
     tempat, gampang maintain. Kartu mesin yang punya event OFF aktif dapat
     badge "Buffer" + rentang tanggalnya, supaya user paham kenapa plan-nya
     naik menjelang mesin itu off (pre-build otomatis oleh engine).

     Master Mesin & TPT Cap (Aturan #8, MachineMasterManager.vue) juga panel
     collapsible di sini — identitas mesin unik per area + cap TPT (jam/shift)
     yang dipakai kartu-kartu di grid ini (ganti hardcode 11h/10h lama). -->
<template>
  <div class="page-root">
    <header class="header-bar">
      <div class="header-title">
        <div class="header-icon"><i class="mdi mdi-view-grid-outline"></i></div>
        <div>
          <h1>Utilisasi Mesin</h1>
          <p>Persentase TPT tiap mesin — realtime dari data plan produksi</p>
        </div>
      </div>

      <div class="header-controls">
        <div class="period-select">
          <i class="mdi mdi-map-marker-outline"></i>
          <select v-model="areaCode" @change="load">
            <option v-for="a in AREAS" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="period-select">
          <i class="mdi mdi-calendar-outline"></i>
          <input type="date" v-model="dateStr" @change="load" />
        </div>
        <button class="btn-refresh" :disabled="loading" @click="load">
          <i class="mdi" :class="loading ? 'mdi-loading mdi-spin' : 'mdi-refresh'"></i>
          {{ loading ? 'Memuat...' : 'Refresh' }}
        </button>
        <button class="btn-buffer-toggle" :class="{ 'btn-buffer-toggle--active': showMasterPanel }" @click="showMasterPanel = !showMasterPanel">
          <i class="mdi mdi-cog-outline"></i>
          Master Mesin
          <i class="mdi" :class="showMasterPanel ? 'mdi-chevron-up' : 'mdi-chevron-down'"></i>
        </button>
        <button class="btn-buffer-toggle" :class="{ 'btn-buffer-toggle--active': showBufferPanel }" @click="showBufferPanel = !showBufferPanel">
          <i class="mdi mdi-robot-off-outline"></i>
          Buffer Mesin OFF
          <i class="mdi" :class="showBufferPanel ? 'mdi-chevron-up' : 'mdi-chevron-down'"></i>
        </button>
      </div>
    </header>

    <!-- Panel Master Mesin & TPT Cap (Aturan #8, collapsible) -->
    <Transition name="panel-slide">
      <div v-if="showMasterPanel" class="buffer-panel">
        <MachineMasterManager :area="areaCode" @changed="load" />
      </div>
    </Transition>

    <!-- Panel Buffer Mesin OFF (collapsible) — dulu halaman sendiri -->
    <Transition name="panel-slide">
      <div v-if="showBufferPanel" class="buffer-panel">
        <MachineOffManager :year="year" :month="month" :area="areaCode" @changed="load" />
      </div>
    </Transition>

    <div class="body-scroll">
      <div v-if="loading" class="state-box">
        <i class="mdi mdi-loading mdi-spin text-2xl"></i>
        <span>Memuat utilisasi mesin...</span>
      </div>
      <div v-else-if="error" class="state-box state-box--error">
        <i class="mdi mdi-alert-circle-outline text-2xl"></i>
        <span>{{ error }}</span>
      </div>
      <div v-else-if="!machines.length" class="state-box">
        <i class="mdi mdi-robot-off-outline text-2xl"></i>
        <span>Tidak ada mesin dengan data plan untuk area/tanggal ini.</span>
      </div>

      <div v-else class="machine-grid">
        <button
          v-for="m in machines"
          :key="m.machine"
          class="machine-card"
          :class="cardClass(m)"
          @click="openDetail(m.machine)"
        >
          <div class="card-top">
            <span class="machine-name">{{ m.machine }}</span>
            <span class="part-count">
              {{ m.part_count }} part
              <span v-if="m.wip_part_count > 0" class="wip-badge" :title="`${m.fp_part_count} FP · ${m.wip_part_count} WIP`">
                {{ m.fp_part_count }} FP · {{ m.wip_part_count }} WIP
              </span>
            </span>
          </div>

          <div class="shift-block">
            <div class="shift-label"><i class="mdi mdi-weather-sunny"></i> Day</div>
            <div class="bar-track"><div class="bar-fill" :class="barClass(m.pct_day)" :style="{ width: Math.min(100, m.pct_day) + '%' }"></div></div>
            <div class="shift-value">{{ m.hours_day }}/{{ m.cap_day_hours }} jam · <strong>{{ m.pct_day }}%</strong></div>
          </div>

          <div class="shift-block">
            <div class="shift-label"><i class="mdi mdi-weather-night"></i> Night</div>
            <div class="bar-track"><div class="bar-fill" :class="barClass(m.pct_night)" :style="{ width: Math.min(100, m.pct_night) + '%' }"></div></div>
            <div class="shift-value">{{ m.hours_night }}/{{ m.cap_night_hours }} jam · <strong>{{ m.pct_night }}%</strong></div>
          </div>

          <div v-if="bufferInfoFor(m.machine)" class="buffer-note" :title="bufferInfoFor(m.machine)!.reason || ''">
            <i class="mdi mdi-package-variant-closed"></i>
            Buffer aktif {{ bufferInfoFor(m.machine)!.range }}
          </div>

          <div v-if="m.pct_day > 100 || m.pct_night > 100" class="bottleneck-flag">
            <i class="mdi mdi-alert"></i> Bottleneck
          </div>
        </button>
      </div>
    </div>

    <!-- Detail per part — reuse modal yang sama dgn Edit Plan -->
    <MachineCompetitionModal
      v-if="detailMachine"
      :show="!!detailMachine"
      :year="year"
      :month="month"
      :area-code="areaCode"
      :machine="detailMachine"
      :tanggal="tanggal"
      @close="detailMachine = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import mutasiService, { type MachineUtilizationRow } from '@/services/Public/Welding/mutasiService';
import MachineCompetitionModal from '@/components/welding/mutation/MachineCompetitionModal.vue';
import MachineOffManager from '@/components/welding/planning/MachineOffManager.vue';
import MachineMasterManager from '@/components/welding/planning/MachineMasterManager.vue';
import { usePlanningConfig } from '@/composables/usePlanningConfig';
import { useWeldingAreas } from '@/composables/useWeldingAreas';

// Area aktif master Area & Mesin (ms_welding_area)
const { zones: AREAS, load: loadAreas } = useWeldingAreas();
loadAreas();

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const areaCode = ref('SA ADM');
const dateStr  = ref(todayIso());

const year    = computed(() => Number(dateStr.value.slice(0, 4)));
const month   = computed(() => Number(dateStr.value.slice(5, 7)));
const tanggal = computed(() => Number(dateStr.value.slice(8, 10)));

const loading = ref(false);
const error   = ref<string | null>(null);
const machines = ref<MachineUtilizationRow[]>([]);

const detailMachine = ref<string | null>(null);
function openDetail(machine: string) { detailMachine.value = machine; }

// ── Master Mesin & TPT Cap (Aturan #8) ─────────────────────────────
const showMasterPanel = ref(false);

// ── Buffer Mesin OFF (digabung dari halaman terpisah) ─────────────
const showBufferPanel = ref(false);
const { machineOffList, fetchMachineOff } = usePlanningConfig();

interface BufferInfo { range: string; reason: string | null }
const bufferByMachine = computed<Record<string, BufferInfo>>(() => {
  const map: Record<string, { min: string; max: string; reason: string | null }> = {};
  for (const r of machineOffList.value) {
    if (!r.is_active) continue;
    const key = r.machine || '*'; // '*' = seluruh area (machine null)
    if (!map[key]) map[key] = { min: r.off_date, max: r.off_date, reason: r.reason ?? null };
    else {
      if (r.off_date < map[key].min) map[key].min = r.off_date;
      if (r.off_date > map[key].max) map[key].max = r.off_date;
      if (!map[key].reason && r.reason) map[key].reason = r.reason;
    }
  }
  const out: Record<string, BufferInfo> = {};
  for (const k in map) {
    const { min, max, reason } = map[k];
    out[k] = { range: min === max ? fmtDateShort(min) : `${fmtDateShort(min)}–${fmtDateShort(max)}`, reason };
  }
  return out;
});
function bufferInfoFor(machine: string): BufferInfo | null {
  return bufferByMachine.value[machine] || bufferByMachine.value['*'] || null;
}
function fmtDateShort(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function barClass(pct: number): string {
  if (pct > 100) return 'bar-over';
  if (pct >= 85) return 'bar-warn';
  return 'bar-ok';
}
function cardClass(m: MachineUtilizationRow): string {
  if (m.pct_day > 100 || m.pct_night > 100) return 'machine-card--over';
  if (m.pct_day >= 85 || m.pct_night >= 85) return 'machine-card--warn';
  return '';
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [res] = await Promise.all([
      mutasiService.getMachineUtilization(year.value, month.value, areaCode.value, tanggal.value),
      fetchMachineOff({ year: year.value, month: month.value, area: areaCode.value }),
    ]);
    if (!res.success || !res.data) throw new Error(res.message ?? 'Gagal memuat utilisasi mesin');
    machines.value = res.data.machines;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan';
    machines.value = [];
  } finally {
    loading.value = false;
  }
}

// Panel buffer/master punya form/tabelnya sendiri yg reload mandiri; kalau
// ditutup lalu dibuka lagi, atau CRUD di panel selesai (emit 'changed'), data
// grid (badge buffer, cap TPT per mesin) ikut disegarkan.
watch(showBufferPanel, (v) => { if (!v) load(); });
watch(showMasterPanel, (v) => { if (!v) load(); });

onMounted(load);
</script>

<style scoped>
.page-root {
  position: fixed;
  top: var(--v-layout-top, 0px);
  left: var(--v-layout-left, 0px);
  right: 0;
  bottom: var(--v-layout-bottom, 0px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  overflow: hidden;
}

.header-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; flex-wrap: wrap; gap: 8px;
}
.header-title { display: flex; align-items: center; gap: 10px; }
.header-icon {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #7c3aed, #4338ca);
  color: #fff; display: flex; align-items: center; justify-content: center; font-size: 17px;
}
.header-title h1 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.2; }
.header-title p { font-size: 11px; color: #94a3b8; margin: 2px 0 0; }

.header-controls { display: flex; align-items: center; gap: 8px; }
.period-select {
  display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #64748b; font-size: 12px;
}
.period-select select, .period-select input { border: none; background: transparent; font-size: 12px; color: #334155; outline: none; cursor: pointer; }

.btn-refresh {
  display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
  border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #475569;
  font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-refresh:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-buffer-toggle {
  display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
  border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #475569;
  font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-buffer-toggle:hover { background: #f8fafc; border-color: #94a3b8; }
.btn-buffer-toggle--active { background: #ede9fe; border-color: #a78bfa; color: #6d28d9; }

.buffer-panel {
  flex-shrink: 0; padding: 14px 16px; background: #fff;
  border-bottom: 1px solid #e2e8f0; overflow-y: auto; max-height: 46vh;
}
.panel-slide-enter-active, .panel-slide-leave-active { transition: max-height 0.2s ease, opacity 0.2s ease; }
.panel-slide-enter-from, .panel-slide-leave-to { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; }

.body-scroll { flex: 1; overflow-y: auto; padding: 16px; }

.state-box {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  padding: 60px 0; color: #94a3b8; font-size: 13px;
}
.state-box--error { color: #dc2626; }

.machine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.machine-card {
  display: flex; flex-direction: column; gap: 10px; text-align: left;
  padding: 14px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; transition: all 0.15s; position: relative;
}
.machine-card:hover { border-color: #a78bfa; box-shadow: 0 4px 12px rgba(124,58,237,0.15); transform: translateY(-1px); }
.machine-card--warn { border-color: #fbbf24; }
.machine-card--over { border-color: #f87171; background: #fef2f2; }

.card-top { display: flex; align-items: baseline; justify-content: space-between; }
.machine-name { font-size: 14px; font-weight: 800; color: #1e293b; font-family: 'SFMono-Regular', Consolas, monospace; }
.part-count { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 10.5px; color: #94a3b8; font-weight: 600; }
.wip-badge {
  padding: 1px 6px; border-radius: 999px; background: #fef9c3; color: #a16207;
  font-size: 9px; font-weight: 700; letter-spacing: 0.01em; white-space: nowrap;
}

.shift-block { display: flex; flex-direction: column; gap: 3px; }
.shift-label { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.shift-value { font-size: 11px; color: #475569; }
.shift-value strong { color: #1e293b; }

.bar-track { height: 7px; border-radius: 4px; background: #e2e8f0; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.2s; }
.bar-ok   { background: #22c55e; }
.bar-warn { background: #f59e0b; }
.bar-over { background: #ef4444; }

.bottleneck-flag {
  position: absolute; top: 10px; right: 10px;
  display: flex; align-items: center; gap: 3px;
  padding: 2px 7px; border-radius: 999px; background: #ef4444; color: #fff;
  font-size: 9px; font-weight: 700; letter-spacing: 0.03em;
}

.buffer-note {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 8px; border-radius: 7px; background: #eef2ff; color: #4338ca;
  font-size: 10px; font-weight: 600; line-height: 1.3;
}
.buffer-note i { font-size: 12px; flex-shrink: 0; }
</style>
