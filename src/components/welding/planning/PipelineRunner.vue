<template>
  <!-- PipelineRunner.vue
       Komponen: pilih year/month/area, jalankan full pipeline atau 1 step -->
  <div class="pipeline-runner">

    <!-- ── Control bar ──────────────────────────────────────────────────────── -->
    <div class="runner-bar">

      <!-- Konteks periode (dari header global — read-only) -->
      <div class="runner-context">
        <i class="ti ti-calendar-event runner-ctx-icon" />
        <span class="runner-ctx-period">
          {{ year }} · {{ MONTHS_SHORT[(month - 1)] }}
        </span>
        <span class="runner-ctx-area">
          <i class="ti ti-map-pin" />
          {{ area || 'Semua Area' }}
        </span>
      </div>

      <div class="runner-divider" />

      <!-- Mode toggle -->
      <div class="mode-toggle">
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': !stepMode }"
          @click="stepMode = false"
        >
          <i class="ti ti-player-play" /> Full
        </button>
        <button
          class="mode-btn"
          :class="{ 'mode-btn--active': stepMode }"
          @click="stepMode = true"
        >
          <i class="ti ti-player-skip-forward" /> 1 Step
        </button>
      </div>

      <!-- Force (hanya full mode) -->
      <label v-if="!stepMode" class="force-label">
        <input v-model="force" type="checkbox" />
        Force ulang
      </label>

      <!-- Run button -->
      <button class="btn btn--run" :disabled="running" @click="onRun">
        <i :class="running ? 'ti ti-loader-2 spin' : 'ti ti-player-play'" />
        {{ running
          ? 'Berjalan…'
          : stepMode
            ? `Step ${selectedStep?.spStep ?? selectedStepId}`
            : 'Jalankan Pipeline'
        }}
      </button>
    </div>

    <!-- ── Step picker (mode 1 step) ─────────────────────────────────────── -->
    <div v-if="stepMode" class="step-picker">
      <div class="step-picker-header">
        <i class="ti ti-list-numbers" />
        <span>Pilih step yang akan dijalankan:</span>
        <span class="step-picker-hint">Klik salah satu step di bawah ini</span>
      </div>
      <div class="step-picker-grid">
        <button
          v-for="s in STEP_OPTIONS"
          :key="s.backendId"
          class="step-card"
          :class="{
            'step-card--active':  selectedStepId === s.backendId,
            'step-card--done':    s.implemented,
            'step-card--skip':    !s.implemented,
          }"
          @click="selectedStepId = s.backendId"
        >
          <div class="step-card-num">{{ s.spStep }}</div>
          <div class="step-card-name">{{ s.name }}</div>
          <div class="step-card-badge" :class="s.implemented ? 'badge--ok' : 'badge--skip'">
            {{ s.implemented ? '✓' : 'SKIP' }}
          </div>
        </button>
      </div>
    </div>

    <!-- ── Progress bar ────────────────────────────────────────────────────── -->
    <div v-if="progressVisible" class="progress-wrap">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPct + '%' }" />
      </div>
      <span v-if="running && !stepMode" class="progress-label">
        {{ streamedSteps }} / 16 step
      </span>
    </div>

    <!-- ── Hasil pipeline / step ─────────────────────────────────────────── -->
    <template v-if="pipelineResult && (pipelineResult.steps.length > 0 || !running)">
      <!-- Summary header -->
      <div
        class="result-header"
        :class="running ? 'result-header--run' : (pipelineResult.success ? 'result-header--ok' : 'result-header--err')"
      >
        <div class="result-title">
          <i
            :class="`ti ti-${running ? 'loader-2 spin' : (pipelineResult.success ? 'circle-check' : 'circle-x')}`"
            aria-hidden="true"
          />
          {{ running
              ? `Pipeline berjalan… (${streamedSteps}/16)`
              : stepMode
                ? (pipelineResult.success ? `Step ${selectedStepId} selesai` : `Step ${selectedStepId} gagal`)
                : (pipelineResult.success ? 'Pipeline selesai' : 'Pipeline gagal')
          }}
        </div>
        <div class="result-meta">
          <span v-if="!running && pipelineResult.elapsed_ms">
            {{ pipelineResult.elapsed_ms.toLocaleString() }} ms
          </span>
          <span v-if="pipelineResult.params">
            {{ pipelineResult.params.year }}-{{ String(pipelineResult.params.month).padStart(2,'0') }}
            {{ pipelineResult.params.area !== 'ALL' ? '· ' + pipelineResult.params.area : '· Semua area' }}
          </span>
        </div>
      </div>

      <!-- Step log -->
      <div class="step-list">
        <div
          v-for="step in pipelineResult.steps"
          :key="step.step"
          class="step-item"
          :class="{
            'step-item--ok':   step.status === 'OK',
            'step-item--err':  step.status === 'ERROR',
            'step-item--skip': step.status === 'SKIP',
          }"
        >
          <!-- Step number badge -->
          <div class="step-num" :class="`step-num--${step.status?.toLowerCase()}`">
            <i v-if="step.status === 'OK'"    class="ti ti-check" />
            <i v-else-if="step.status === 'ERROR'" class="ti ti-x" />
            <i v-else-if="step.status === 'SKIP'"  class="ti ti-minus" />
            <template v-else>{{ step.step }}</template>
          </div>

          <div class="step-body">
            <!-- Header row -->
            <div class="step-top">
              <span class="step-label">
                {{ step.label || stepLabelById(String(step.step)) }}
              </span>
              <span class="step-right">
                <span v-if="(step.rows ?? 0) > 0" class="step-rows">
                  <i class="ti ti-table-row" />
                  {{ (step.rows ?? 0).toLocaleString('id') }} baris
                </span>
                <span :class="`step-badge step-badge--${(step.status ?? 'skip').toLowerCase()}`">
                  <i v-if="step.status === 'OK'"    class="ti ti-check" />
                  <i v-else-if="step.status === 'ERROR'" class="ti ti-alert-triangle" />
                  <i v-else class="ti ti-minus" />
                  {{ step.status ?? 'SKIP' }}
                </span>
              </span>
            </div>

            <!-- Summary sentence (auto-generated dari params) -->
            <div v-if="step.status === 'OK' && stepSummary(step)" class="step-summary">
              {{ stepSummary(step) }}
            </div>

            <!-- Error detail -->
            <div v-if="step.status === 'ERROR' && step.error" class="step-error">
              <i class="ti ti-alert-circle" />
              <span>{{ step.error }}</span>
            </div>

            <!-- Stat grid -->
            <div v-if="step.params && Object.keys(step.params).length" class="step-stat-grid">
              <div v-for="(val, key) in step.params" v-show="!PARAM_HIDDEN.has(String(key))" :key="key" class="step-stat">
                <i :class="`ti ti-${paramMeta(String(key)).icon}`" class="step-stat-icon" />
                <div class="step-stat-body">
                  <span class="step-stat-val">{{ formatParamVal(String(key), val) }}</span>
                  <span class="step-stat-label">{{ paramMeta(String(key)).label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading row: step berikutnya sedang berjalan -->
        <div v-if="running && !stepMode" class="step-item step-item--loading">
          <div class="step-num step-num--loading">
            <i class="ti ti-loader-2 spin" />
          </div>
          <div class="step-body">
            <div class="step-top">
              <span class="step-label step-label--muted">Menjalankan step berikutnya…</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Error message global -->
      <div v-if="!running && !pipelineResult.success && pipelineResult.message" class="run-error">
        <i class="ti ti-alert-circle" aria-hidden="true" />
        {{ pipelineResult.message }}
      </div>
    </template>

    <!-- ── Empty state ─────────────────────────────────────────────────────── -->
    <div v-else-if="!running" class="run-empty">
      <i :class="stepMode ? 'ti ti-player-skip-forward' : 'ti ti-player-play'" aria-hidden="true" />
      <p v-if="stepMode">Pilih step dan jalankan untuk melihat output satu langkah.</p>
      <p v-else>Pilih periode dan jalankan pipeline untuk melihat log 16-step.</p>
      <p class="run-empty-sub">Semua parameter rumus diambil dari konfigurasi yang sudah ditentukan.</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PipelineResult, PipelineStep } from '@/composables/usePlanningConfig'

const props = defineProps<{
  running:        boolean
  pipelineResult: PipelineResult | null
  year:           number
  month:          number
  area:           string | null
  runFn:     (p: { year: number; month: number; area?: string | null; force?: boolean }) => Promise<any>
  runStepFn: (p: { year: number; month: number; step_id: string; area?: string | null }) => Promise<any>
}>()

// ─── Step options — backendId harus cocok dengan M_formula_engine::_step_ids()
// implemented: true = sudah ada logic PHP, false = masih SKIP
const STEP_OPTIONS = [
  { backendId: '1',   spStep: '1',   name: 'Seed Data Part',                   implemented: true  },
  { backendId: '2',   spStep: '2',   name: 'Terapkan Forecast MDFO',            implemented: true  },
  { backendId: '3',   spStep: '3',   name: 'Terapkan Jadwal DN (Order Fix)',     implemented: true  },
  { backendId: '3.5', spStep: '3.5', name: 'Deteksi Anomali DN',                implemented: true  },
  { backendId: '4',   spStep: '4',   name: 'Buat Jadwal LKH',                   implemented: true  },
  { backendId: '5',   spStep: '5',   name: 'Ambil Data Aktual',                 implemented: true  },
  { backendId: '5.5', spStep: '5.5', name: 'Hitung Pcs/Hari',                   implemented: true  },
  { backendId: '5.7', spStep: '5.7', name: 'Skoring Prioritas Part',            implemented: true  },
  { backendId: '5.8', spStep: '5.8', name: 'Proyeksi Kebutuhan Jangka Panjang', implemented: true  },
  { backendId: '6',   spStep: '6',   name: 'Hitung Rolling Stok (Pertama)',      implemented: true  },
  { backendId: '7',   spStep: '7',   name: 'Smart Planning (CLAMP)',             implemented: true  },
  { backendId: '7.5', spStep: '7.5', name: 'Analisis Pola Achievement',          implemented: true  },
  { backendId: '8',   spStep: '8',   name: 'Safety Net & Koreksi Akhir',         implemented: true  },
  { backendId: '6b',  spStep: '6★',  name: 'Hitung Rolling Stok (Final)',        implemented: true  },
  { backendId: '8.5', spStep: '8.5', name: 'Deteksi Pola Miss Kronis',           implemented: true  },
  { backendId: '8.9', spStep: '8.9', name: 'Generate Alert & Notifikasi',        implemented: true  },
]

// ─── Param meta: label + ikon untuk setiap key dari API ──────────────────────
// Key-key yang ada di sini ditampilkan di stat-grid; key yang tidak ada akan
// fallback ke label = key itu sendiri + icon hash.
// Key period/spmon disembunyikan karena sudah tampil di result-header.
const PARAM_META: Record<string, { label: string; icon: string; unit?: string }> = {
  // ── Step 1 ────────────────────────────────────────────────────────────────
  parts:             { label: 'Part aktif',           icon: 'box' },
  variants:          { label: 'Varian part',           icon: 'copy' },
  inserted:          { label: 'Baris baru',            icon: 'row-insert-bottom' },
  deleted:           { label: 'Baris dihapus',         icon: 'row-remove' },
  updated:           { label: 'Baris diperbarui',      icon: 'pencil' },
  days:              { label: 'Hari dalam bulan',      icon: 'calendar-month' },
  // ── Step 2 ────────────────────────────────────────────────────────────────
  parts_with_mdfo:   { label: 'Part ada MDFO',         icon: 'chart-line' },
  // ── Step 3 ────────────────────────────────────────────────────────────────
  rows_day:          { label: 'DN Day',                icon: 'sun' },
  rows_night:        { label: 'DN Night',              icon: 'moon' },
  rows_total:        { label: 'Total DN',              icon: 'arrows-join' },
  parts_with_dn:     { label: 'Part ada DN',           icon: 'truck-delivery' },
  // ── Step 3.5 ──────────────────────────────────────────────────────────────
  spike_sigma:       { label: 'Sigma spike',           icon: 'trending-up' },
  drop_sigma:        { label: 'Sigma drop',            icon: 'trending-down' },
  min_samples:       { label: 'Min. sampel',           icon: 'database' },
  streak_days:       { label: 'Streak hari',           icon: 'calendar-repeat' },
  hist_from:         { label: 'Historis dari',         icon: 'calendar-minus' },
  dn_spike_drop:     { label: 'Spike/Drop DN',         icon: 'bolt' },
  mdfo_mismatch:     { label: 'MDFO mismatch',         icon: 'switch-horizontal' },
  plan_miss_streak:  { label: 'Miss streak',           icon: 'mood-sad' },
  total_detected:    { label: 'Total anomali',         icon: 'alert-triangle' },
  // ── Step 4 ────────────────────────────────────────────────────────────────
  header_id:         { label: 'Workdays header',       icon: 'id' },
  carry_fwd:         { label: 'Carry-forward',         icon: 'arrow-forward' },
  days_in_mo:        { label: 'Hari dalam bulan',      icon: 'calendar' },
  // ── Step 5 ────────────────────────────────────────────────────────────────
  lines_mapped:      { label: 'Line dipetakan',        icon: 'route' },
  parts_mapped:      { label: 'Part dipetakan',        icon: 'map-pin' },
  // ── Step 5.5 ──────────────────────────────────────────────────────────────
  parts_with_avg:    { label: 'Part-minggu dihitung',  icon: 'chart-bar' },
  // ── Step 5.7 ──────────────────────────────────────────────────────────────
  parts_ranked:      { label: 'Part diranking',        icon: 'sort-descending' },
  critical:          { label: 'Status KRITIS',         icon: 'alert-circle' },
  deficit:           { label: 'Status DEFICIT',        icon: 'minus-vertical' },
  // ── Step 5.8 ──────────────────────────────────────────────────────────────
  parts_inserted:    { label: 'Part diproyeksi',       icon: 'chart-dots' },
  significant_demand:{ label: 'Ada permintaan',        icon: 'trending-up' },
  sisa_hari:         { label: 'Sisa hari',             icon: 'hourglass', unit: 'hari' },
  // ── Step 6 / 6b ──────────────────────────────────────────────────────────
  parts_count:       { label: 'Jumlah part',           icon: 'box' },
  cutoff_day:        { label: 'Cutoff hari ke-',       icon: 'calendar-event' },
  cutoff_shift:      { label: 'Cutoff shift',          icon: 'clock-2' },
  // ── Step 7 ────────────────────────────────────────────────────────────────
  rows_planned:      { label: 'Baris direncanakan',    icon: 'calendar-plus' },
  workdays_hdr:      { label: 'Workdays header',       icon: 'id' },
  // ── Step 7.5 ──────────────────────────────────────────────────────────────
  patterns_built:    { label: 'Pattern dibangun',      icon: 'chart-dots-3' },
  reliable:          { label: 'Pattern reliable',      icon: 'circle-check' },
  hist_months:       { label: 'Bulan historis',        icon: 'history', unit: 'bln' },
  // ── Step 8 ────────────────────────────────────────────────────────────────
  variant_reset:     { label: 'Variant direset',       icon: 'refresh' },
  note:              { label: 'Catatan',               icon: 'info-circle' },
  // ── Step 8.5 ──────────────────────────────────────────────────────────────
  parts_analyzed:    { label: 'Part dianalisis',       icon: 'search' },
  chronic_miss:      { label: 'Chronic miss',          icon: 'repeat-off' },
  // ── Step 8.9 ──────────────────────────────────────────────────────────────
  alerts:            { label: 'Alert pending',         icon: 'bell-ringing' },
  anomaly_new:       { label: 'Anomali aktif (NEW)',   icon: 'alert-triangle' },
  // ── Umum ──────────────────────────────────────────────────────────────────
  rows:              { label: 'Total baris',           icon: 'table-row' },
  elapsed_ms:        { label: 'Waktu proses',          icon: 'clock', unit: 'ms' },
  workdays:          { label: 'Hari kerja',            icon: 'calendar-check' },
}

// Key yang disembunyikan dari stat-grid (sudah tampil di header / tidak relevan)
const PARAM_HIDDEN = new Set(['period', 'spmon'])

function paramMeta(key: string) {
  return PARAM_META[key] ?? { label: key, icon: 'hash' }
}

function formatParamVal(key: string, val: any): string {
  const meta = PARAM_META[key]
  const num  = typeof val === 'number' ? val : Number(val)
  if (!isNaN(num)) {
    const formatted = num.toLocaleString('id')
    return meta?.unit ? `${formatted} ${meta.unit}` : formatted
  }
  return String(val ?? '—')
}

// Label nama step berdasarkan step id (fallback jika label dari API kosong)
function stepLabelById(id: string): string {
  return STEP_OPTIONS.find(s => s.backendId === id)?.name ?? `Step ${id}`
}

// Summary sentence otomatis per step
function stepSummary(step: PipelineStep): string {
  const p = step.params
  if (!p) return ''
  const id = String(step.step)
  if (id === '1') {
    const parts    = p.parts    ?? 0
    const days     = p.days     ?? 0
    const inserted = p.inserted ?? 0
    const deleted  = p.deleted  ?? 0
    const updated  = p.updated  ?? 0
    const parts_   = Number(parts); const days_ = Number(days)
    let s = `${parts_.toLocaleString('id')} part × ${days_} hari`
    const actions: string[] = []
    if (Number(inserted) > 0) actions.push(`${Number(inserted).toLocaleString('id')} baris baru`)
    if (Number(updated)  > 0) actions.push(`${Number(updated).toLocaleString('id')} diperbarui`)
    if (Number(deleted)  > 0) actions.push(`${Number(deleted).toLocaleString('id')} usang dihapus`)
    if (actions.length) s += ' — ' + actions.join(', ')
    else s += ' — data sudah terkini'
    return s
  }
  if (id === '2') {
    const upd = p.updated ?? p.rows ?? 0
    const pts = p.parts_with_mdfo ?? 0
    return `${Number(upd).toLocaleString('id')} baris MDFO diperbarui${pts ? ` (${Number(pts).toLocaleString('id')} part)` : ''}`
  }
  if (id === '3') {
    const tot = p.rows_total ?? p.rows ?? 0
    const pdn = p.parts_with_dn ?? 0
    return `${Number(tot).toLocaleString('id')} baris DN diterapkan${pdn ? ` — ${Number(pdn).toLocaleString('id')} part` : ''}`
  }
  if (id === '3.5') {
    const tot = p.total_detected ?? p.rows ?? 0
    return `${Number(tot).toLocaleString('id')} anomali terdeteksi (spike/drop/mismatch/streak)`
  }
  if (id === '4') {
    const upd   = p.updated   ?? p.rows ?? 0
    const carry = p.carry_fwd ?? 0
    const warn  = p.warning   ?? ''
    let s = `${Number(upd).toLocaleString('id')} baris jadwal LKH dihitung`
    if (Number(carry) > 0) s += `, carry-fwd ${Number(carry).toLocaleString('id')} hari`
    if (warn) s += ` — ${warn}`
    return s
  }
  if (id === '5') {
    const upd  = p.updated ?? p.rows ?? 0
    const ln   = p.lines_mapped ?? 0
    return `${Number(upd).toLocaleString('id')} baris aktual diisi${ln ? ` (${Number(ln).toLocaleString('id')} line dipetakan)` : ''}`
  }
  if (id === '5.5') {
    const upd  = p.updated ?? p.rows ?? 0
    const pts  = p.parts_with_avg ?? 0
    return `${Number(upd).toLocaleString('id')} baris pcs/hari dihitung${pts ? ` (${Number(pts).toLocaleString('id')} part-minggu)` : ''}`
  }
  if (id === '5.7') {
    const ranked   = p.parts_ranked ?? p.rows ?? 0
    const critical = p.critical     ?? 0
    const deficit  = p.deficit      ?? 0
    let s = `${Number(ranked).toLocaleString('id')} part diranking`
    if (Number(deficit)  > 0) s += `, ${Number(deficit).toLocaleString('id')} DEFICIT`
    if (Number(critical) > 0) s += `, ${Number(critical).toLocaleString('id')} CRITICAL`
    return s
  }
  if (id === '5.8') {
    const parts = p.parts_inserted     ?? p.rows ?? 0
    const sig   = p.significant_demand ?? 0
    const sisa  = p.sisa_hari          ?? 0
    return `${Number(parts).toLocaleString('id')} part diproyeksi${sig ? ` (${Number(sig).toLocaleString('id')} ada demand)` : ''}${sisa ? `, ${sisa} hari sisa` : ''}`
  }
  if (id === '6') {
    const upd   = p.updated      ?? p.rows ?? 0
    const parts = p.parts_count  ?? 0
    const cut   = p.cutoff_day   ?? 0
    return `${Number(upd).toLocaleString('id')} baris rolling stok${parts ? ` (${Number(parts).toLocaleString('id')} part)` : ''}${cut ? `, cutoff hari ${cut}` : ''}`
  }
  if (id === '7') {
    const parts      = p.parts        ?? 0
    const planned    = p.rows_planned ?? 0
    const upd        = p.updated      ?? 0
    const wdHdr      = p.workdays_hdr ?? 0
    const cutDay     = p.cutoff_day   ?? 0
    const cutShift   = p.cutoff_shift ?? ''
    let s = `${Number(parts).toLocaleString('id')} part, ${Number(planned).toLocaleString('id')} baris direncanakan`
    if (Number(upd) > 0) s += `, ${Number(upd).toLocaleString('id')} baris diperbarui`
    if (cutDay)   s += ` · cutoff hari ${cutDay} shift ${cutShift}`
    if (!wdHdr)   s += ' · workdays fallback DOW'
    return s
  }
  if (id === '7.5') {
    const built    = p.patterns_built ?? p.rows ?? 0
    const reliable = p.reliable       ?? 0
    const hist     = p.hist_months    ?? 3
    return `${Number(built).toLocaleString('id')} pattern dibangun (${Number(reliable).toLocaleString('id')} reliable) dari ${hist} bulan historis`
  }
  if (id === '8') {
    const reset = p.variant_reset ?? 0
    return reset > 0
      ? `${Number(reset).toLocaleString('id')} baris variant di-reset · ach_rate terintegrasi di Step 7`
      : 'Semua variant bersih · ach_rate terintegrasi di Step 7'
  }
  if (id === '6b') {
    const upd   = p.updated     ?? p.rows ?? 0
    const parts = p.parts_count ?? 0
    const cut   = p.cutoff_day  ?? 0
    return `${Number(upd).toLocaleString('id')} baris rolling stok final${parts ? ` (${Number(parts).toLocaleString('id')} part)` : ''}${cut ? `, cutoff hari ${cut}` : ''}`
  }
  if (id === '8.5') {
    const analyzed = p.parts_analyzed ?? p.rows ?? 0
    const chronic  = p.chronic_miss   ?? 0
    return `${Number(analyzed).toLocaleString('id')} part dianalisis — ${Number(chronic).toLocaleString('id')} chronic miss terdeteksi`
  }
  if (id === '8.9') {
    const alerts  = p.alerts      ?? p.rows ?? 0
    const anomaly = p.anomaly_new ?? 0
    let s = `${Number(alerts).toLocaleString('id')} alert pending`
    if (Number(anomaly) > 0) s += ` · ${Number(anomaly).toLocaleString('id')} anomali aktif`
    return s
  }
  return ''
}

// ─── State ────────────────────────────────────────────────────────────────────
const stepMode       = ref(false)
const selectedStepId = ref('1')
const selectedStep   = computed(() => STEP_OPTIONS.find(s => s.backendId === selectedStepId.value))

const force = ref(false)

const TOTAL_STEPS = 16

// Progress driven dari jumlah step yang sudah di-stream (full pipeline)
const streamedSteps = computed(() =>
  props.pipelineResult?.steps?.length ?? 0
)

// progressPct: computed saat running, ref untuk animasi 100% saat selesai
const progressPct     = ref(0)
const progressVisible = ref(false)

watch(
  [() => props.running, streamedSteps],
  ([isRunning, done]) => {
    if (isRunning) {
      progressVisible.value = true
      if (stepMode.value) {
        progressPct.value = 50
      } else {
        const pct = (done / TOTAL_STEPS) * 100
        progressPct.value = Math.min(95, Math.max(5, pct))
      }
    } else if (progressVisible.value) {
      // Pipeline selesai — flash ke 100% lalu sembunyikan
      progressPct.value = 100
      setTimeout(() => { progressVisible.value = false; progressPct.value = 0 }, 900)
    }
  },
  { immediate: true }
)

// ─── Run handler ──────────────────────────────────────────────────────────────
async function onRun() {
  if (stepMode.value) {
    await props.runStepFn({
      year:    props.year,
      month:   props.month,
      step_id: selectedStepId.value,
      area:    props.area,
    })
  } else {
    await props.runFn({
      year:  props.year,
      month: props.month,
      area:  props.area,
      force: force.value,
    })
  }
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

</script>

<style scoped>
.pipeline-runner {}

/* ── Runner control bar ───────────────────────────────────────────────────── */
.runner-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-bottom: 1.25rem; padding: 0.75rem 1.25rem;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
}

/* Konteks periode read-only */
.runner-context {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: var(--border-radius-md);
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-secondary);
  font-size: 12px; font-weight: 500; color: var(--color-text-primary);
  flex-shrink: 0;
}
.runner-ctx-icon { color: var(--color-primary, #6366f1); font-size: 14px; }
.runner-ctx-period { letter-spacing: 0.01em; }
.runner-ctx-area {
  display: flex; align-items: center; gap: 3px;
  padding-left: 8px; border-left: 1px solid var(--color-border-tertiary);
  color: var(--color-text-secondary); font-weight: 400;
}
.runner-divider {
  width: 1px; height: 24px; background: var(--color-border-tertiary);
  flex-shrink: 0;
}

/* Run button */
.btn--run {
  margin-left: auto;
  background: var(--color-text-primary); color: var(--color-background-primary);
  border-color: transparent; font-weight: 500;
}
.btn--run:hover:not(:disabled) { opacity: 0.88; }

/* ── Step picker panel ────────────────────────────────────────────────────── */
.step-picker {
  margin-bottom: 1.25rem;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.step-picker-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  background: var(--color-background-secondary);
  border-bottom: 0.5px solid var(--color-border-tertiary);
  font-size: 13px; font-weight: 600;
  color: var(--color-text-primary);
}
.step-picker-header i { font-size: 16px; color: var(--color-primary, #6366f1); }
.step-picker-hint {
  margin-left: auto; font-size: 11px; font-weight: 400;
  color: var(--color-text-secondary); font-style: italic;
}

.step-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  padding: 12px 14px;
}

.step-card {
  display: flex; flex-direction: column; gap: 4px;
  padding: 10px 12px; border-radius: 8px; text-align: left; cursor: pointer;
  border: 1.5px solid var(--color-border-secondary);
  background: var(--color-background-primary);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  position: relative;
}
.step-card:hover {
  border-color: var(--color-primary, #6366f1);
  background: #f5f3ff;
  box-shadow: 0 2px 8px rgba(99,102,241,.12);
}
.step-card--active {
  border-color: var(--color-primary, #6366f1) !important;
  background: #eef2ff !important;
  box-shadow: 0 0 0 3px rgba(99,102,241,.15), 0 2px 8px rgba(99,102,241,.15);
}
.step-card--skip { opacity: .72; }
.step-card--skip:hover { opacity: 1; }

.step-card-num {
  font-size: 18px; font-weight: 700; line-height: 1;
  color: var(--color-primary, #6366f1);
}
.step-card--skip .step-card-num { color: var(--color-text-tertiary, #94a3b8); }
.step-card--active .step-card-num { color: #4338ca; }

.step-card-name {
  font-size: 11.5px; font-weight: 500; line-height: 1.3;
  color: var(--color-text-primary);
}

.step-card-badge {
  display: inline-flex; align-items: center;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em;
  padding: 2px 6px; border-radius: 20px; margin-top: 2px;
  width: fit-content;
}
.badge--ok   { background: #dcfce7; color: #15803d; }
.badge--skip { background: #f1f5f9; color: #94a3b8; }

/* ── Mode toggle ──────────────────────────────────────────────────────────── */
.mode-toggle {
  display: flex;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.mode-btn {
  flex: 1; padding: 6px 12px; font-size: 12px;
  display: flex; align-items: center; gap: 5px;
  background: var(--color-background-primary);
  color: var(--color-text-secondary);
  border: none; cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.mode-btn:first-child { border-right: 0.5px solid var(--color-border-secondary); }
.mode-btn:hover:not(.mode-btn--active) { background: var(--color-background-secondary); }
.mode-btn--active {
  background: var(--color-text-primary);
  color: var(--color-background-primary);
  font-weight: 500;
}

.force-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--color-text-secondary);
  cursor: pointer; user-select: none;
}

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 13px;
  border-radius: var(--border-radius-md); border: 0.5px solid transparent;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--primary { background: var(--color-text-primary); color: var(--color-background-primary); }
.btn--primary:hover:not(:disabled) { opacity: 0.88; }

/* ── Progress ─────────────────────────────────────────────────────────────── */
.progress-wrap {
  display: flex; align-items: center; gap: 10px; margin-bottom: 1rem;
}
.progress-bar {
  flex: 1; height: 4px; background: var(--color-border-tertiary);
  border-radius: 2px; overflow: hidden;
}
.progress-fill {
  height: 100%; background: var(--color-primary, #6366f1);
  border-radius: 2px; transition: width 0.4s ease;
}
.progress-label {
  font-size: 11px; color: var(--color-text-secondary);
  white-space: nowrap; font-variant-numeric: tabular-nums;
}

/* ── Result header ────────────────────────────────────────────────────────── */
.result-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1rem; border-radius: var(--border-radius-md);
  margin-bottom: 0.75rem; font-size: 13px; flex-wrap: wrap; gap: 8px;
}
.result-header--ok  { background: var(--color-background-success); color: var(--color-text-success); }
.result-header--err { background: var(--color-background-danger);  color: var(--color-text-danger); }
.result-header--run { background: var(--color-background-info, #eff6ff); color: var(--color-text-info, #3b82f6); }
.result-title { display: flex; align-items: center; gap: 7px; font-weight: 500; }
.result-meta  { display: flex; gap: 12px; font-size: 12px; opacity: 0.85; }

/* ── Step list ────────────────────────────────────────────────────────────── */
.step-list { display: flex; flex-direction: column; gap: 6px; }

.step-item {
  display: flex; gap: 12px;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  padding: 0.75rem 0.875rem; align-items: flex-start;
}
.step-item--ok      { border-left: 3px solid var(--color-text-success, #22c55e); }
.step-item--err     { border-left: 3px solid var(--color-text-danger, #ef4444); background: var(--color-background-danger); }
.step-item--skip    { border-left: 3px solid var(--color-border-secondary, #d1d5db); opacity: 0.7; }
.step-item--loading { border-left: 3px solid var(--color-primary, #6366f1); opacity: 0.65; animation: pulse 1.4s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 0.65; }
  50%       { opacity: 0.9; }
}

.step-num {
  width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%;
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
  font-size: 12px; font-weight: 600; font-family: var(--font-mono, monospace);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 1.5px var(--color-border-secondary);
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}
.step-num i { font-size: 14px; }
.step-num--ok      { background: #f0fdf4; color: #16a34a; box-shadow: 0 0 0 1.5px #22c55e; }
.step-num--error   { background: #fef2f2; color: #dc2626; box-shadow: 0 0 0 1.5px #ef4444; }
.step-num--skip    { background: var(--color-background-secondary); color: var(--color-text-tertiary); box-shadow: 0 0 0 1.5px var(--color-border-tertiary); }
.step-num--loading { background: #eff6ff; color: var(--color-primary, #6366f1); box-shadow: 0 0 0 1.5px var(--color-primary, #6366f1); }

.step-body { flex: 1; min-width: 0; }

.step-top {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 5px; flex-wrap: wrap;
}

.step-label        { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.step-label--muted { color: var(--color-text-secondary); font-style: italic; font-weight: 400; }
.step-right { display: flex; align-items: center; gap: 8px; }
.step-rows  {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--color-text-secondary);
}
.step-rows i { font-size: 12px; }

.step-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; padding: 3px 8px;
  border-radius: 6px; font-weight: 500;
}
.step-badge i { font-size: 11px; }
.step-badge--ok    { background: var(--color-background-success); color: var(--color-text-success); }
.step-badge--skip  { background: var(--color-background-secondary); color: var(--color-text-tertiary); box-shadow: 0 0 0 1px var(--color-border-tertiary); }
.step-badge--error { background: var(--color-background-danger);  color: var(--color-text-danger); }

.step-error {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--color-text-danger);
  margin-bottom: 5px;
}

/* ── Step summary sentence ────────────────────────────────────────────────── */
.step-summary {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 4px 0 8px;
  line-height: 1.5;
}

/* ── Stat grid (menggantikan param pills) ─────────────────────────────────── */
.step-stat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.step-stat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  min-width: 100px;
}

.step-stat-icon {
  font-size: 15px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.step-stat-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.step-stat-val {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.step-stat-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ── Run error ────────────────────────────────────────────────────────────── */
.run-error {
  display: flex; align-items: center; gap: 8px;
  padding: 0.75rem 1rem; border-radius: var(--border-radius-md);
  background: var(--color-background-danger); color: var(--color-text-danger);
  font-size: 13px; margin-top: 0.75rem;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.run-empty {
  text-align: center; padding: 3rem 1rem; color: var(--color-text-tertiary);
}
.run-empty i  { font-size: 36px; display: block; margin-bottom: 0.75rem; }
.run-empty p  { font-size: 13px; margin: 0 0 4px; }
.run-empty-sub { font-size: 12px; opacity: 0.7; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 1s linear infinite; }
</style>
