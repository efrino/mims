<!-- components/welding/mutation/MachineCompetitionModal.vue
     Kompetisi Mesin (Aturan #7-lanjutan) — semua part yang berbagi 1 mesin di
     1 tanggal, berapa jam & persen TPT (11h day / 10h night) yang kepakai
     masing-masing. Dibuka dari capacity-bar PlanEditModal supaya user tahu
     part yang lagi diedit kebagian berapa % dari mesin yang dipakai bareng
     part lain — bukan cuma batas teoretis kalau sendirian. -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-box">
          <div class="modal-header">
            <div class="flex items-center gap-2.5">
              <div class="header-icon"><i class="mdi mdi-robot-industrial text-base"></i></div>
              <div>
                <p class="modal-title">Kompetisi Mesin</p>
                <p class="modal-subtitle">
                  <span class="font-mono font-bold">{{ machine }}</span>
                  &nbsp;·&nbsp; Tgl {{ tanggal }} {{ monthLabel }}
                </p>
              </div>
            </div>
            <button class="modal-close-btn" @click="$emit('close')"><i class="mdi mdi-close"></i></button>
          </div>

          <div class="modal-body">
            <div v-if="loading" class="state-box">
              <i class="mdi mdi-loading mdi-spin"></i> Memuat...
            </div>
            <div v-else-if="error" class="state-box state-box--error">
              <i class="mdi mdi-alert-circle-outline"></i> {{ error }}
            </div>
            <template v-else-if="data">
              <!-- Ringkasan total pemakaian mesin -->
              <div class="summary-row">
                <div class="summary-card">
                  <span class="summary-label"><i class="mdi mdi-weather-sunny"></i> Total Day</span>
                  <div class="bar-track">
                    <div class="bar-fill" :class="barClass(data.total_pct_day)" :style="{ width: Math.min(100, data.total_pct_day) + '%' }"></div>
                  </div>
                  <span class="summary-value">{{ data.total_hours_day }} / {{ data.cap_day_hours }} jam ({{ data.total_pct_day }}%)</span>
                </div>
                <div class="summary-card">
                  <span class="summary-label"><i class="mdi mdi-weather-night"></i> Total Night</span>
                  <div class="bar-track">
                    <div class="bar-fill" :class="barClass(data.total_pct_night)" :style="{ width: Math.min(100, data.total_pct_night) + '%' }"></div>
                  </div>
                  <span class="summary-value">{{ data.total_hours_night }} / {{ data.cap_night_hours }} jam ({{ data.total_pct_night }}%)</span>
                </div>
              </div>
              <p class="summary-note">
                <i class="mdi mdi-information-outline"></i>
                {{ data.parts.length }} part berbagi mesin ini di tanggal tsb. Total &gt; 100% berarti ada yang tak tertampung TPT (jadi bottleneck / tergeser ke shift lain).
              </p>

              <!-- Tabel per part -->
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th class="c">Tipe</th>
                      <th class="c">Mode</th>
                      <th class="r">DN D/N</th>
                      <th class="r">Plan D/N</th>
                      <th class="r">Jam Day</th>
                      <th>% Day</th>
                      <th class="r">Jam Night</th>
                      <th>% Night</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in data.parts" :key="p.part_type + '|' + p.part_number" :class="{ 'row-highlight': p.part_number === highlightPartNo }">
                      <td class="mono">
                        {{ p.part_number }}
                        <span v-if="p.part_number === highlightPartNo" class="you-badge">sedang diedit</span>
                      </td>
                      <td class="c"><span class="type-chip" :class="'type-' + p.part_type.toLowerCase()">{{ p.part_type }}</span></td>
                      <td class="c"><span class="mode-chip" :class="'mode-' + p.shift_mode">{{ modeLabel(p.shift_mode) }}</span></td>
                      <td class="r mono">{{ p.part_type === 'WIP' ? '–' : `${p.dn_day}/${p.dn_night}` }}</td>
                      <td class="r mono">{{ p.plan_day }}/{{ p.plan_night }}</td>
                      <td class="r mono">{{ p.hours_day }}</td>
                      <td>
                        <div class="mini-bar-track"><div class="mini-bar-fill" :class="barClass(p.pct_day)" :style="{ width: Math.min(100, p.pct_day) + '%' }"></div></div>
                        <span class="pct-text">{{ p.pct_day }}%</span>
                      </td>
                      <td class="r mono">{{ p.hours_night }}</td>
                      <td>
                        <div class="mini-bar-track"><div class="mini-bar-fill" :class="barClass(p.pct_night)" :style="{ width: Math.min(100, p.pct_night) + '%' }"></div></div>
                        <span class="pct-text">{{ p.pct_night }}%</span>
                      </td>
                      <td class="note-cell">{{ noteText(p) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="$emit('close')">Tutup</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import mutasiService, { type MachineCompetitionData } from '@/services/Public/Welding/mutasiService';

interface Props {
  show: boolean;
  year: number;
  month: number;
  areaCode: string;
  machine: string;
  tanggal: number;
  highlightPartNo?: string;
}
const props = defineProps<Props>();
defineEmits<{ close: [] }>();

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<MachineCompetitionData | null>(null);

const monthLabel = computed(() => {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return names[(props.month ?? 1) - 1] ?? '';
});

function modeLabel(m: string): string {
  return m === 'day' ? 'Day only' : m === 'night' ? 'Night only' : '2 Shift';
}
function barClass(pct: number): string {
  if (pct > 100) return 'bar-over';
  if (pct >= 85) return 'bar-warn';
  return 'bar-ok';
}

// Aturan #7/#9 — tampilkan alasan plan (termasuk prioritas urgensi & nama mesin
// tersempit kalau dibatasi shared-budget). Prioritaskan shift yang punya qty.
// Aturan #13 — WIP tak punya day_note/night_note (backend isi null, konsepnya
// tak berlaku krn demand WIP turunan dari FP induk, bukan hasil step_7_planning).
function noteText(p: { plan_day: number; plan_night: number; day_note: string | null; night_note: string | null; part_type: 'FP' | 'WIP' }): string {
  if (p.part_type === 'WIP') return 'Demand turunan dari plan FP induk';
  const parts: string[] = [];
  if (p.plan_day > 0 && p.day_note) parts.push(`Day: ${p.day_note}`);
  if (p.plan_night > 0 && p.night_note) parts.push(`Night: ${p.night_note}`);
  if (!parts.length) {
    if (p.day_note) parts.push(`Day: ${p.day_note}`);
    if (p.night_note) parts.push(`Night: ${p.night_note}`);
  }
  return parts.length ? parts.join(' / ') : '—';
}

async function load() {
  loading.value = true;
  error.value = null;
  data.value = null;
  try {
    const res = await mutasiService.getMachineCompetition(props.year, props.month, props.areaCode, props.machine, props.tanggal);
    if (!res.success || !res.data) throw new Error(res.message ?? 'Gagal memuat kompetisi mesin');
    data.value = res.data;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan';
  } finally {
    loading.value = false;
  }
}

// `immediate: true` WAJIB — kalau parent me-mount komponen ini dgn `v-if`
// (baru ada saat show sudah true sejak awal, bukan transisi false->true),
// watch tanpa immediate tak akan pernah kepicu sama sekali (pernah kejadian:
// modal kebuka kosong krn load() tak pernah jalan). Ikut reload kalau
// machine/tanggal/area berubah selagi modal masih terbuka.
watch(
  () => [props.show, props.machine, props.tanggal, props.areaCode],
  ([v]) => { if (v) load(); },
  { immediate: true }
);
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 99995;
  background: rgba(15, 23, 42, 0.55);
  display: flex; align-items: center; justify-content: center; padding: 16px;
  backdrop-filter: blur(2px);
}
.modal-box {
  background: var(--dm-surface, #fff); border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  width: 620px; max-width: 100%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between; padding: 14px 16px;
  background: linear-gradient(135deg, #7c3aed 0%, #4338ca 100%); color: white; flex-shrink: 0;
}
.header-icon {
  width: 34px; height: 34px; border-radius: 8px; background: rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center; font-size: 15px;
}
.modal-title { font-size: 13px; font-weight: 700; line-height: 1.2; }
.modal-subtitle { font-size: 11px; opacity: 0.85; margin-top: 1px; }
.modal-close-btn {
  width: 28px; height: 28px; border-radius: 6px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.modal-close-btn:hover { background: rgba(255,255,255,0.25); color: white; }

.modal-body { padding: 14px 16px; overflow-y: auto; flex: 1; }
.state-box { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 40px 0; color: var(--dm-faint, #94a3b8); font-size: 13px; }
.state-box--error { color: var(--dm-on-red, #dc2626); }

.summary-row { display: flex; gap: 12px; margin-bottom: 8px; }
.summary-card { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 8px; background: var(--dm-surface2, #f8fafc); border: 1px solid var(--dm-border, #e2e8f0); }
.summary-label { display: flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--dm-muted, #64748b); text-transform: uppercase; letter-spacing: 0.03em; }
.summary-value { font-size: 11px; font-weight: 600; color: var(--dm-cell, #334155); }

.bar-track { height: 8px; border-radius: 4px; background: var(--dm-bg, #e2e8f0); overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.2s; }
.bar-ok   { background: #22c55e; }
.bar-warn { background: #f59e0b; }
.bar-over { background: #ef4444; }

.summary-note { display: flex; align-items: flex-start; gap: 5px; font-size: 10.5px; color: var(--dm-faint, #94a3b8); margin: 6px 0 12px; line-height: 1.4; }
.summary-note .mdi { flex-shrink: 0; margin-top: 1px; }

.table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--dm-border, #e2e8f0); }
table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
thead th {
  text-align: left; padding: 7px 10px; background: var(--dm-surface2, #f8fafc); color: var(--dm-muted, #64748b); font-weight: 700;
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1px solid var(--dm-border, #e2e8f0); white-space: nowrap;
}
thead th.c { text-align: center; }
thead th.r { text-align: right; }
tbody td { padding: 7px 10px; border-bottom: 1px solid var(--dm-border, #f1f5f9); color: var(--dm-cell, #334155); white-space: nowrap; }
tbody td.c { text-align: center; }
tbody td.r { text-align: right; }
.mono { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 11px; }
.note-cell { white-space: normal; min-width: 220px; max-width: 320px; color: var(--dm-muted, #64748b); line-height: 1.4; }

.row-highlight { background: var(--dm-tint-blue, #eff6ff); }
.you-badge {
  display: inline-block; margin-left: 6px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.02em;
  padding: 1px 5px; border-radius: 3px; background: #2563eb; color: #fff; white-space: nowrap;
}

.mode-chip { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 600; }
.mode-both  { background: var(--dm-tint-violet, #ede9fe); color: #7c3aed; }
.mode-day   { background: var(--dm-tint-amber, #fef3c7); color: var(--dm-on-amber, #b45309); }
.mode-night { background: var(--dm-tint-blue, #dbeafe); color: var(--dm-accent, #1d4ed8); }

.type-chip { display: inline-block; padding: 1px 7px; border-radius: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.02em; }
.type-fp  { background: var(--dm-tint-green, #dcfce7); color: var(--dm-on-green, #15803d); }
.type-wip { background: var(--dm-tint-amber, #fef9c3); color: var(--dm-on-amber, #a16207); }

.mini-bar-track { width: 60px; height: 6px; border-radius: 3px; background: var(--dm-bg, #e2e8f0); overflow: hidden; display: inline-block; vertical-align: middle; }
.mini-bar-fill { height: 100%; border-radius: 3px; }
.pct-text { display: inline-block; margin-left: 6px; font-size: 10.5px; font-weight: 600; color: var(--dm-muted, #64748b); vertical-align: middle; }

.modal-footer { display: flex; justify-content: flex-end; padding: 12px 16px; background: var(--dm-surface2, #f8fafc); border-top: 1px solid var(--dm-border, #e5e9f0); flex-shrink: 0; }
.btn-cancel {
  padding: 7px 16px; border: 1.5px solid var(--dm-border-strong, #d1d5db); border-radius: 6px; font-size: 12px; font-weight: 600;
  color: var(--dm-muted, #6b7280); background: var(--dm-surface, white); cursor: pointer;
}
.btn-cancel:hover { border-color: #9ca3af; color: var(--dm-cell, #374151); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.18s ease; }
.modal-fade-enter-active .modal-box, .modal-fade-leave-active .modal-box { transition: transform 0.18s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-box, .modal-fade-leave-to .modal-box { transform: scale(0.96) translateY(-8px); }
</style>
