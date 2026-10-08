<!-- components/welding/mutation/PlanEditModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="modal-overlay" @click.self="!submitting && $emit('close')">
        <div v-if="ctx" class="modal-box">
          <!-- ── Header ─────────────────────────────────────── -->
          <div class="modal-header">
            <div class="flex items-center gap-2.5">
              <div class="header-icon">
                <i class="mdi mdi-pencil-lock text-base"></i>
              </div>
              <div>
                <p class="modal-title">Edit Plan Produksi</p>
                <p class="modal-subtitle">
                  <span class="font-mono font-bold">{{ ctx.partNo }}</span>
                  &nbsp;·&nbsp; Tgl {{ ctx.tanggal }}&nbsp;
                  <span class="text-blue-200">{{ monthName }}</span>
                </p>
              </div>
            </div>
            <button class="modal-close-btn" @click="!submitting && $emit('close')" :disabled="submitting">
              <i class="mdi mdi-close"></i>
            </button>
          </div>

          <!-- Part name info -->
          <div v-if="ctx.partName" class="part-info-bar">
            <i class="mdi mdi-tag-outline text-gray-400 text-xs"></i>
            <span class="text-gray-600 text-xs">{{ ctx.partName }}</span>
          </div>

          <!-- Kapasitas (Aturan #7) — mesin/UPH/shift mode/TPT cap, referensi
               sebelum user menaikkan nilai plan manual tanpa tahu batasnya. -->
          <div v-if="ctx.machine || ctx.uph || ctx.shiftMode" class="capacity-bar">
            <div class="cap-item" :title="'Mesin FP part ini'">
              <i class="mdi mdi-robot-industrial-outline"></i>
              <span>{{ ctx.machine || '—' }}</span>
            </div>
            <div v-if="ctx.uph" class="cap-item" title="Unit per hour mesin">
              <i class="mdi mdi-speedometer"></i>
              <span>{{ ctx.uph }} pcs/jam</span>
            </div>
            <div class="cap-item" :class="{ 'cap-item--warn': ctx.shiftMode !== 'both' }" title="Mode shift part (Aturan #5)">
              <i class="mdi mdi-timer-outline"></i>
              <span>{{ shiftModeLabel }}</span>
            </div>
            <button
              v-if="ctx.machine"
              class="cap-link"
              @click="showCompetition = true"
              title="Lihat semua part yang berbagi mesin ini di tanggal yang sama, dan berapa % TPT masing-masing"
            >
              <i class="mdi mdi-chart-donut"></i> Lihat kompetisi mesin
            </button>
          </div>

          <!-- ── Body ───────────────────────────────────────── -->
          <div class="modal-body">
            <!-- Day Shift -->
            <div class="shift-card" :class="form.lock_day ? 'shift-card--locked' : 'shift-card--free'">
              <div class="shift-card-header">
                <div class="flex items-center gap-1.5">
                  <i class="mdi mdi-weather-sunny text-amber-500 text-sm"></i>
                  <span class="shift-title">SHIFT DAY</span>
                  <span v-if="form.lock_day" class="lock-badge"> <i class="mdi mdi-lock text-xs"></i> LOCKED </span>
                  <span v-if="ctx.shiftMode === 'night'" class="mode-off-badge" title="Part ini di-set mode Night only — shift Day tidak diproduksi engine">
                    <i class="mdi mdi-power-off text-xs"></i> Nonaktif (mode Night only)
                  </span>
                </div>
                <!-- Lock toggle -->
                <button
                  class="lock-toggle"
                  :class="form.lock_day ? 'lock-toggle--on' : 'lock-toggle--off'"
                  @click="form.lock_day = !form.lock_day"
                  :title="
                    form.lock_day ? 'Klik untuk unlock — SP bisa timpa nilai ini' : 'Klik untuk lock — SP tidak bisa mengubah nilai ini'
                  "
                >
                  <i :class="form.lock_day ? 'mdi mdi-lock' : 'mdi mdi-lock-open-variant-outline'"></i>
                  {{ form.lock_day ? 'Locked' : 'Unlocked' }}
                </button>
              </div>

              <div class="shift-card-body">
                <div class="input-group">
                  <label class="input-label">Nilai Plan</label>
                  <input
                    v-model.number="form.plan_day"
                    type="number"
                    min="0"
                    step="1"
                    class="plan-input"
                    :class="{ 'plan-input--locked': form.lock_day, 'plan-input--overcap': maxTheoDay !== null && (form.plan_day ?? 0) > maxTheoDay }"
                    placeholder="0"
                    @focus="($event.target as HTMLInputElement).select()"
                  />
                </div>
                <!-- Auto hint + reset -->
                <div v-if="ctx.dateData.plan_day_auto !== null && ctx.dateData.plan_day_auto !== undefined" class="auto-hint">
                  <span class="auto-label">Auto SP:</span>
                  <span class="auto-value">{{ ctx.dateData.plan_day_auto }}</span>
                  <button
                    v-if="form.plan_day !== ctx.dateData.plan_day_auto || form.lock_day"
                    class="reset-auto-btn"
                    @click="resetDayToAuto"
                    title="Isi dengan nilai terakhir dari SP + unlock"
                  >
                    <i class="mdi mdi-restore text-xs"></i> Reset ke auto
                  </button>
                </div>
              </div>

              <!-- Batas TPT (Aturan #7) -->
              <div v-if="maxTheoDay !== null" class="tpt-hint" :class="{ 'tpt-hint--over': (form.plan_day ?? 0) > maxTheoDay }">
                <i class="mdi mdi-gauge-full"></i>
                Batas TPT {{ ctx.tptCapDayHours }} jam ≈ maks <strong>{{ maxTheoDay }} pcs</strong> (kalau part ini sendirian di mesin — part lain di mesin yang sama ikut berebut jam ini)
              </div>
              <!-- Keterangan (Aturan #7) — alasan auto-plan shift ini -->
              <div v-if="ctx.dateData.day_note" class="reason-hint">
                <i class="mdi mdi-information-outline"></i> {{ ctx.dateData.day_note }}
              </div>
            </div>

            <!-- Night Shift -->
            <div class="shift-card" :class="form.lock_night ? 'shift-card--locked' : 'shift-card--free'">
              <div class="shift-card-header">
                <div class="flex items-center gap-1.5">
                  <i class="mdi mdi-weather-night text-indigo-400 text-sm"></i>
                  <span class="shift-title">SHIFT NIGHT</span>
                  <span v-if="form.lock_night" class="lock-badge lock-badge--night"> <i class="mdi mdi-lock text-xs"></i> LOCKED </span>
                  <span v-if="ctx.shiftMode === 'day'" class="mode-off-badge" title="Part ini di-set mode Day only — shift Night tidak diproduksi engine">
                    <i class="mdi mdi-power-off text-xs"></i> Nonaktif (mode Day only)
                  </span>
                </div>
                <button
                  class="lock-toggle"
                  :class="form.lock_night ? 'lock-toggle--on' : 'lock-toggle--off'"
                  @click="form.lock_night = !form.lock_night"
                  :title="form.lock_night ? 'Klik untuk unlock' : 'Klik untuk lock'"
                >
                  <i :class="form.lock_night ? 'mdi mdi-lock' : 'mdi mdi-lock-open-variant-outline'"></i>
                  {{ form.lock_night ? 'Locked' : 'Unlocked' }}
                </button>
              </div>

              <div class="shift-card-body">
                <div class="input-group">
                  <label class="input-label">Nilai Plan</label>
                  <input
                    v-model.number="form.plan_night"
                    type="number"
                    min="0"
                    step="1"
                    class="plan-input"
                    :class="{ 'plan-input--locked': form.lock_night, 'plan-input--overcap': maxTheoNight !== null && (form.plan_night ?? 0) > maxTheoNight }"
                    placeholder="0"
                    @focus="($event.target as HTMLInputElement).select()"
                  />
                </div>
                <div v-if="ctx.dateData.plan_night_auto !== null && ctx.dateData.plan_night_auto !== undefined" class="auto-hint">
                  <span class="auto-label">Auto SP:</span>
                  <span class="auto-value">{{ ctx.dateData.plan_night_auto }}</span>
                  <button
                    v-if="form.plan_night !== ctx.dateData.plan_night_auto || form.lock_night"
                    class="reset-auto-btn"
                    @click="resetNightToAuto"
                    title="Isi dengan nilai terakhir dari SP + unlock"
                  >
                    <i class="mdi mdi-restore text-xs"></i> Reset ke auto
                  </button>
                </div>
              </div>

              <!-- Batas TPT (Aturan #7) -->
              <div v-if="maxTheoNight !== null" class="tpt-hint" :class="{ 'tpt-hint--over': (form.plan_night ?? 0) > maxTheoNight }">
                <i class="mdi mdi-gauge-full"></i>
                Batas TPT {{ ctx.tptCapNightHours }} jam ≈ maks <strong>{{ maxTheoNight }} pcs</strong> (kalau part ini sendirian di mesin — part lain di mesin yang sama ikut berebut jam ini)
              </div>
              <!-- Keterangan (Aturan #7) — alasan auto-plan shift ini -->
              <div v-if="ctx.dateData.night_note" class="reason-hint">
                <i class="mdi mdi-information-outline"></i> {{ ctx.dateData.night_note }}
              </div>
            </div>

            <!-- Alasan (wajib bila plan diubah dari auto / di-lock) — bahan analisis pola planner -->
            <div v-if="needsReason" class="note-group">
              <label class="input-label">
                <i class="mdi mdi-help-circle-outline text-gray-400"></i>
                Alasan perubahan <span class="reason-req">wajib</span>
              </label>
              <div class="reason-chips" role="radiogroup" aria-label="Alasan perubahan">
                <button
                  v-for="r in PLAN_REASONS" :key="r.code" type="button"
                  class="reason-chip" :class="{ 'reason-chip--on': form.reason === r.code }"
                  role="radio" :aria-checked="form.reason === r.code"
                  @click="form.reason = r.code"
                >
                  <i class="mdi" :class="r.icon"></i>{{ r.label }}
                </button>
              </div>
            </div>

            <!-- Note -->
            <div class="note-group">
              <label class="input-label">
                <i class="mdi mdi-note-text-outline text-gray-400"></i>
                Catatan
                <span v-if="form.reason === 'OTHER'" class="reason-req">wajib utk "Lainnya"</span>
                <span v-else class="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input v-model="form.note" type="text" class="note-input" placeholder="Detail perubahan..." maxlength="200" />
            </div>

            <!-- Lock info — siapa yang mengunci sebelumnya -->
            <div v-if="ctx.dateData.locked_by" class="lock-info-bar">
              <i class="mdi mdi-information-outline text-blue-400"></i>
              <span
                >Dikunci oleh <strong>{{ ctx.dateData.locked_by }}</strong></span
              >
              <span v-if="ctx.dateData.locked_at" class="text-gray-400"> · {{ formatDateTime(ctx.dateData.locked_at) }} </span>
              <span v-if="ctx.dateData.lock_note" class="lock-info-note"> · "{{ ctx.dateData.lock_note }}" </span>
            </div>

            <!-- Error -->
            <Transition name="err-fade">
              <div v-if="error" class="modal-error">
                <i class="mdi mdi-alert-circle-outline"></i>
                {{ error }}
              </div>
            </Transition>
          </div>

          <!-- ── Footer ─────────────────────────────────────── -->
          <div class="modal-footer">
            <div class="footer-left">
              <!-- Quick: unlock both to auto -->
              <button
                v-if="hasAnyLock"
                class="btn-reset-both"
                @click="resetBothToAuto"
                :disabled="submitting"
                title="Reset nilai + unlock kedua shift sekaligus"
              >
                <i class="mdi mdi-restore text-xs"></i>
                Reset Semua ke Auto
              </button>
            </div>
            <div class="flex gap-2">
              <button class="btn-cancel" @click="$emit('close')" :disabled="submitting">Batal</button>
              <button
                class="btn-submit" @click="handleSubmit" :disabled="submitting || !hasChanges || !reasonOk"
                :title="!reasonOk ? (form.reason === 'OTHER' ? 'Isi catatan untuk alasan Lainnya' : 'Pilih alasan perubahan') : undefined"
              >
                <i class="mdi" :class="submitting ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i>
                {{ submitting ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Kompetisi Mesin (Aturan #7-lanjutan) — dibuka dari capacity-bar di atas -->
  <MachineCompetitionModal
    v-if="ctx && ctx.machine"
    :show="showCompetition"
    :year="ctx.year"
    :month="ctx.month"
    :area-code="ctx.areaCode"
    :machine="ctx.machine"
    :tanggal="ctx.tanggal"
    :highlight-part-no="ctx.partNo"
    @close="showCompetition = false"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import type { PlanEditContext, PlanEditFormData } from '@/composables/usePlanLock';
import { PLAN_REASONS } from '@/types/Public/Welding/planning';
import MachineCompetitionModal from '@/components/welding/mutation/MachineCompetitionModal.vue';

// Aturan #7-lanjutan — sub-modal kompetisi mesin, dibuka dari capacity-bar.
const showCompetition = ref(false);

interface Props {
  show: boolean;
  ctx: PlanEditContext | null;
  submitting?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  submitting: false,
  error: null
});

const emit = defineEmits<{
  close: [];
  submit: [form: PlanEditFormData];
}>();

// ── Form state ────────────────────────────────────────────────────
const form = reactive<PlanEditFormData>({
  plan_day: 0,
  plan_night: 0,
  lock_day: false,
  lock_night: false,
  note: '',
  reason: null
});

// Sync form ketika ctx berubah (modal baru dibuka)
watch(
  () => props.ctx,
  (ctx) => {
    showCompetition.value = false; // ganti part/tanggal -> tutup sub-modal lama
    if (!ctx) return;
    form.plan_day = ctx.dateData.day ?? 0;
    form.plan_night = ctx.dateData.night ?? 0;
    form.lock_day = ctx.dateData.lock_day ?? false;
    form.lock_night = ctx.dateData.lock_night ?? false;
    form.note = '';
    form.reason = null;
  },
  { immediate: true }
);

// ── Computed ──────────────────────────────────────────────────────
const hasAnyLock = computed(() => form.lock_day || form.lock_night);

// Aturan #7 — panel kapasitas: label mode shift + batas teoretis TPT per shift
// (kalau part ini SENDIRIAN memonopoli mesin — part lain berebut jam yang sama,
// jadi ini batas ATAS, bukan jaminan kapasitas beneran tersedia segitu).
const shiftModeLabel = computed(() => {
  const m = props.ctx?.shiftMode;
  return m === 'day' ? 'Day only' : m === 'night' ? 'Night only' : '2 Shift (Day + Night)';
});

function theoreticalMaxPcs(capHours: number | undefined, uph: number | null | undefined, qtyKbn: number | undefined): number | null {
  if (!capHours || !uph || uph <= 0 || !qtyKbn || qtyKbn <= 0) return null;
  const hoursPerKanban = qtyKbn / uph;
  if (hoursPerKanban <= 0) return null;
  const maxKanban = Math.floor(capHours / hoursPerKanban);
  return maxKanban * qtyKbn;
}
const maxTheoDay = computed(() => theoreticalMaxPcs(props.ctx?.tptCapDayHours, props.ctx?.uph, props.ctx?.qtyKbn));
const maxTheoNight = computed(() => theoreticalMaxPcs(props.ctx?.tptCapNightHours, props.ctx?.uph, props.ctx?.qtyKbn));

const hasChanges = computed(() => {
  if (!props.ctx) return false;
  const d = props.ctx.dateData;
  return (
    form.plan_day !== (d.day ?? 0) ||
    form.plan_night !== (d.night ?? 0) ||
    form.lock_day !== (d.lock_day ?? false) ||
    form.lock_night !== (d.lock_night ?? false)
  );
});

// Alasan wajib bila hasil akhir menyimpang dari auto atau di-lock (edit manual).
// Hanya unlock/reset ke auto → tak perlu alasan.
const needsReason = computed(() => {
  if (!props.ctx || !hasChanges.value) return false;
  const d = props.ctx.dateData;
  return form.lock_day || form.lock_night
    || form.plan_day !== (d.plan_day_auto ?? 0) || form.plan_night !== (d.plan_night_auto ?? 0);
});
const reasonOk = computed(() =>
  !needsReason.value || (!!form.reason && (form.reason !== 'OTHER' || !!form.note.trim())));

const monthName = computed(() => {
  if (!props.ctx) return '';
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return names[(props.ctx.month ?? 1) - 1] + '-' + String(props.ctx.year).slice(2);
});

// ── Reset helpers ─────────────────────────────────────────────────
function resetDayToAuto() {
  if (!props.ctx) return;
  form.plan_day = props.ctx.dateData.plan_day_auto ?? 0;
  form.lock_day = false;
}

function resetNightToAuto() {
  if (!props.ctx) return;
  form.plan_night = props.ctx.dateData.plan_night_auto ?? 0;
  form.lock_night = false;
}

function resetBothToAuto() {
  resetDayToAuto();
  resetNightToAuto();
}

// ── Submit ────────────────────────────────────────────────────────
function handleSubmit() {
  if (!reasonOk.value) return;
  emit('submit', { ...form, reason: needsReason.value ? form.reason : null });
}

// ── Helpers ───────────────────────────────────────────────────────
function formatDateTime(dt: string): string {
  try {
    return new Date(dt).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dt;
  }
}
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 99990;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(2px);
}

/* ── Box ─────────────────────────────────────────────────── */
.modal-box {
  background: var(--dm-surface, #fff);
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  width: 420px;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Header ──────────────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #2e5396 0%, #4472c4 100%);
  color: white;
}

.header-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.modal-title {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-subtitle {
  font-size: 11px;
  opacity: 0.85;
  margin-top: 1px;
}

.modal-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
}

.modal-close-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

/* ── Part info bar ───────────────────────────────────────── */
.part-info-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: var(--dm-surface2, #f8fafc);
  border-bottom: 1px solid var(--dm-border, #e5e9f0);
}

/* ── Kapasitas bar (Aturan #7) ───────────────────────────── */
.capacity-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 7px 16px;
  background: var(--dm-tint-amber, #fefce8);
  border-bottom: 1px solid var(--dm-bd-amber, #fde68a);
}
.cap-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dm-on-amber, #713f12);
}
.cap-item .mdi { font-size: 13px; color: var(--dm-on-amber, #a16207); }
.cap-item--warn { color: var(--dm-on-amber, #9a3412); }
.cap-item--warn .mdi { color: var(--dm-on-amber, #ea580c); }

.cap-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 700;
  color: #7c3aed;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
}
.cap-link:hover { text-decoration: underline; }
.cap-link .mdi { font-size: 13px; }

/* Badge shift dinonaktifkan oleh shift_mode (Aturan #5) */
.mode-off-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--dm-bg, #f1f5f9);
  color: var(--dm-muted, #64748b);
}

/* Batas TPT teoretis per shift */
.tpt-hint {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding: 6px 10px;
  margin: 0 12px 8px;
  background: var(--dm-surface2, #f8fafc);
  border: 1px solid var(--dm-border, #e2e8f0);
  border-radius: 6px;
  font-size: 10.5px;
  color: var(--dm-muted, #64748b);
  line-height: 1.4;
}
.tpt-hint .mdi { font-size: 13px; color: var(--dm-faint, #94a3b8); flex-shrink: 0; margin-top: 1px; }
.tpt-hint--over {
  background: var(--dm-tint-amber, #fff7ed);
  border-color: #fdba74;
  color: var(--dm-on-amber, #9a3412);
}
.tpt-hint--over .mdi { color: var(--dm-on-amber, #ea580c); }

/* Keterangan alasan auto-plan (Aturan #7) */
.reason-hint {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding: 6px 10px;
  margin: 0 12px 10px;
  background: var(--dm-tint-blue, #eff6ff);
  border: 1px solid var(--dm-bd-blue, #bfdbfe);
  border-radius: 6px;
  font-size: 10.5px;
  color: var(--dm-accent, #1e40af);
  line-height: 1.4;
}
.reason-hint .mdi { font-size: 13px; color: #60a5fa; flex-shrink: 0; margin-top: 1px; }

/* Input plan yang melebihi batas TPT teoretis */
.plan-input--overcap {
  border-color: #fb923c !important;
  background: var(--dm-tint-amber, #fff7ed);
}

/* ── Body ────────────────────────────────────────────────── */
.modal-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: 65vh;
}

/* ── Shift card ──────────────────────────────────────────── */
.shift-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--dm-border, #e5e9f0);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.shift-card--free {
  border-color: var(--dm-border, #e5e9f0);
}

.shift-card--locked {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.12);
}

.shift-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--dm-surface2, #f8fafc);
  border-bottom: 1px solid var(--dm-border, #e5e9f0);
}

.shift-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--dm-cell, #374151);
  letter-spacing: 0.05em;
}

.lock-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--dm-tint-red, #fee2e2);
  color: var(--dm-on-red, #b91c1c);
}

.lock-badge--night {
  background: var(--dm-tint-violet, #ede9fe);
  color: var(--dm-on-violet, #6d28d9);
}

/* ── Lock toggle button ──────────────────────────────────── */
.lock-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1.5px solid;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.lock-toggle--off {
  border-color: var(--dm-border-strong, #d1d5db);
  color: var(--dm-muted, #6b7280);
  background: var(--dm-surface, white);
}

.lock-toggle--off:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: var(--dm-tint-red, #fef2f2);
}

.lock-toggle--on {
  border-color: #ef4444;
  color: #ef4444;
  background: var(--dm-tint-red, #fef2f2);
}

.lock-toggle--on:hover {
  border-color: var(--dm-border-strong, #d1d5db);
  color: var(--dm-muted, #6b7280);
  background: var(--dm-surface, white);
}

/* ── Shift card body ─────────────────────────────────────── */
.shift-card-body {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--dm-surface, white);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--dm-muted, #6b7280);
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 4px;
}

.plan-input {
  width: 100px;
  padding: 7px 10px;
  border: 1.5px solid var(--dm-border-strong, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--dm-text, #1f2937);
  text-align: right;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.plan-input:focus {
  border-color: #4472c4;
  box-shadow: 0 0 0 3px rgba(68, 114, 196, 0.15);
}

.plan-input--locked {
  border-color: var(--dm-bd-red, #fecaca);
  background: var(--dm-tint-red, #fff5f5);
  color: var(--dm-on-red, #b91c1c);
}

.plan-input--locked:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

/* ── Auto hint ───────────────────────────────────────────── */
.auto-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  flex-wrap: wrap;
}

.auto-label {
  font-size: 10px;
  color: var(--dm-faint, #9ca3af);
}

.auto-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--dm-cell, #374151);
  font-family: monospace;
}

.reset-auto-btn {
  font-size: 10px;
  font-weight: 600;
  color: #4472c4;
  padding: 3px 8px;
  border: 1px solid #4472c4;
  border-radius: 4px;
  background: var(--dm-surface, white);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.reset-auto-btn:hover {
  background: #4472c4;
  color: white;
}

/* ── Note ────────────────────────────────────────────────── */
.reason-req { font-size: 9px; font-weight: 700; color: var(--dm-on-amber, #b45309); background: var(--dm-tint-amber, #fef3c7); border-radius: 999px; padding: 0 6px; letter-spacing: 0; }
.reason-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.reason-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 999px;
  border: 1.5px solid var(--dm-border, #e5e9f0); background: var(--dm-surface, #fff); color: var(--dm-text-2, #475569); font-size: 11px; font-weight: 600;
  transition: all .12s;
}
.reason-chip .mdi { font-size: 13px; color: var(--dm-faint, #94a3b8); }
.reason-chip:hover { border-color: var(--dm-bd-blue, #93c5fd); }
.reason-chip--on { border-color: #4472c4; background: var(--dm-tint-blue, #eff6ff); color: var(--dm-accent, #1e40af); }
.reason-chip--on .mdi { color: var(--dm-accent, #2563eb); }

.note-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.note-input {
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid var(--dm-border, #e5e9f0);
  border-radius: 6px;
  font-size: 12px;
  color: var(--dm-cell, #374151);
  outline: none;
  transition: border-color 0.15s;
}

.note-input:focus {
  border-color: #4472c4;
}

/* ── Lock info bar ───────────────────────────────────────── */
.lock-info-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px 10px;
  background: var(--dm-tint-blue, #eff6ff);
  border: 1px solid var(--dm-bd-blue, #bfdbfe);
  border-radius: 6px;
  font-size: 11px;
  color: var(--dm-cell, #374151);
}

.lock-info-note {
  color: var(--dm-muted, #6b7280);
  font-style: italic;
}

/* ── Error ───────────────────────────────────────────────── */
.modal-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--dm-tint-red, #fef2f2);
  border: 1px solid var(--dm-bd-red, #fecaca);
  border-radius: 6px;
  font-size: 11px;
  color: var(--dm-on-red, #b91c1c);
}

/* ── Footer ──────────────────────────────────────────────── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  background: var(--dm-surface2, #f8fafc);
  border-top: 1px solid var(--dm-border, #e5e9f0);
}

.footer-left {
  flex: 1;
}

.btn-reset-both {
  font-size: 11px;
  font-weight: 600;
  color: var(--dm-muted, #6b7280);
  padding: 5px 10px;
  border: 1px solid var(--dm-border-strong, #d1d5db);
  border-radius: 6px;
  background: var(--dm-surface, white);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-reset-both:hover:not(:disabled) {
  color: #ef4444;
  border-color: #ef4444;
}

.btn-cancel {
  padding: 7px 16px;
  border: 1.5px solid var(--dm-border-strong, #d1d5db);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dm-muted, #6b7280);
  background: var(--dm-surface, white);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover:not(:disabled) {
  border-color: #9ca3af;
  color: var(--dm-cell, #374151);
}

.btn-submit {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 18px;
  background: #2e5396;
  color: white;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background: #4472c4;
}

.btn-submit:disabled,
.btn-cancel:disabled,
.btn-reset-both:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Transitions ─────────────────────────────────────────── */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.modal-fade-enter-active .modal-box,
.modal-fade-leave-active .modal-box {
  transition: transform 0.18s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-box,
.modal-fade-leave-to .modal-box {
  transform: scale(0.96) translateY(-8px);
}

.err-fade-enter-active,
.err-fade-leave-active {
  transition: all 0.15s;
}

.err-fade-enter-from,
.err-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
