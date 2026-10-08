<template>
  <!-- PipelineFlow.vue -->
  <!-- Visual interactive pipeline untuk Planning CMS — 16 execution steps -->
  <div class="pipeline-flow">

    <!-- ── Header + tombol run ──────────────────────────────────────────────── -->
    <div class="pf-header">
      <div class="pf-header-left">
        <div class="pf-title">Alur Kalkulasi Planning</div>
        <div class="pf-subtitle">
          16 langkah kalkulasi — dari seed data hingga generate alert, mencakup anomali detection, priority scoring, dan pola achievement.
        </div>
      </div>
      <div class="pf-header-right">
        <div v-if="lastRunAt" class="last-run-info">
          <i class="ti ti-clock" />
          Terakhir: {{ lastRunAt }}
        </div>
        <button
          class="pf-run-btn"
          :class="{ 'pf-run-btn--running': running }"
          :disabled="running"
          @click="$emit('run')"
        >
          <i :class="running ? 'ti ti-loader-2 spin' : 'ti ti-player-play'" />
          {{ running ? 'Sedang Berjalan…' : 'Jalankan Pipeline' }}
        </button>
      </div>
    </div>

    <!-- ── Progress bar saat running ────────────────────────────────────────── -->
    <div v-if="running" class="pf-progress-bar">
      <div class="pf-progress-fill" :style="{ width: progressPct + '%' }" />
    </div>

    <!-- ── Timeline steps ───────────────────────────────────────────────────── -->
    <div class="pf-timeline">
      <div
        v-for="(step, idx) in STEPS"
        :key="step.id"
        class="pf-step"
        :class="getStepClass(idx)"
        @click="toggleDetail(idx)"
      >
        <!-- Connector line (kecuali step terakhir) -->
        <div v-if="idx < STEPS.length - 1" class="pf-connector" :class="getConnectorClass(idx)" />

        <!-- Step bullet -->
        <div class="pf-bullet" :class="getBulletClass(idx)">
          <i v-if="getStepState(idx) === 'done-ok'"    class="ti ti-check" />
          <i v-else-if="getStepState(idx) === 'done-skip'"  class="ti ti-minus" />
          <i v-else-if="getStepState(idx) === 'done-error'" class="ti ti-x" />
          <i v-else-if="getStepState(idx) === 'running'"    class="ti ti-loader-2 spin" />
          <i v-else :class="`ti ti-${step.icon}`" />
        </div>

        <!-- Step content -->
        <div class="pf-step-content">
          <div class="pf-step-head">
            <div class="pf-step-number">Step {{ step.spStep }}</div>
            <span v-if="step.isNew" class="pf-badge-new">BARU</span>
            <div class="pf-step-name">{{ step.name }}</div>

            <!-- Badge hasil (post-run) -->
            <template v-if="getResultStep(idx)">
              <span
                v-if="getResultStep(idx)!.status === 'OK'"
                class="pf-badge pf-badge--ok"
              >
                <i class="ti ti-check" />
                {{ getResultStep(idx)!.rows.toLocaleString('id') }} baris
              </span>
              <span v-else-if="getResultStep(idx)!.status === 'SKIP'" class="pf-badge pf-badge--skip">
                <i class="ti ti-minus" /> SKIP
              </span>
              <span v-else class="pf-badge pf-badge--error">
                <i class="ti ti-alert-triangle" /> ERROR
              </span>
            </template>

            <!-- Chevron expand -->
            <i
              class="pf-chevron ti"
              :class="openIdx === idx ? 'ti-chevron-up' : 'ti-chevron-down'"
            />
          </div>

          <!-- Step description (always visible) -->
          <div class="pf-step-desc">{{ step.desc }}</div>

          <!-- Expanded detail -->
          <transition name="expand">
            <div v-if="openIdx === idx" class="pf-step-detail">
              <!-- Tabel yang dipakai -->
              <div class="pf-detail-section">
                <div class="pf-detail-label">
                  <i class="ti ti-database" /> Tabel yang dipakai
                </div>
                <div class="pf-tags">
                  <span v-for="t in step.tables" :key="t" class="pf-tag pf-tag--table">
                    <i class="ti ti-table" /> {{ t }}
                  </span>
                </div>
              </div>

              <!-- Output dihasilkan -->
              <div class="pf-detail-section">
                <div class="pf-detail-label">
                  <i class="ti ti-arrow-right" /> Apa yang dihasilkan
                </div>
                <div class="pf-step-output">{{ step.output }}</div>
              </div>

              <!-- Parameter config yang digunakan -->
              <div v-if="step.configKeys.length" class="pf-detail-section">
                <div class="pf-detail-label">
                  <i class="ti ti-settings" /> Parameter yang dipakai
                </div>
                <div class="pf-tags">
                  <span v-for="k in step.configKeys" :key="k" class="pf-tag pf-tag--config">
                    <i class="ti ti-variable" /> {{ k }}
                  </span>
                </div>
              </div>

              <!-- Detail hasil run (params dari API) -->
              <div v-if="getResultStep(idx)?.params && Object.keys(getResultStep(idx)!.params!).length" class="pf-detail-section">
                <div class="pf-detail-label">
                  <i class="ti ti-list-details" /> Detail Run Terakhir
                </div>
                <div class="pf-params-grid">
                  <div
                    v-for="(val, key) in getResultStep(idx)!.params"
                    :key="key"
                    class="pf-param-item"
                  >
                    <code>{{ key }}</code>
                    <span>{{ val }}</span>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- ── Summary setelah run ───────────────────────────────────────────────── -->
    <div v-if="props.steps.length && !running" class="pf-summary">
      <div class="pf-summary-stat pf-summary-stat--ok">
        <i class="ti ti-circle-check" />
        <span>{{ okCount }} langkah berhasil</span>
      </div>
      <div v-if="skipCount > 0" class="pf-summary-stat pf-summary-stat--skip">
        <i class="ti ti-circle-dashed" />
        <span>{{ skipCount }} langkah dilewati</span>
      </div>
      <div v-if="errorCount > 0" class="pf-summary-stat pf-summary-stat--error">
        <i class="ti ti-circle-x" />
        <span>{{ errorCount }} langkah gagal</span>
      </div>
      <div class="pf-summary-stat">
        <i class="ti ti-database" />
        <span>{{ totalRows.toLocaleString('id') }} total baris diproses</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PipelineStep } from '@/composables/usePlanningConfig'

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  steps:   PipelineStep[]
  running: boolean
  lastRunAt?: string
}>()

defineEmits<{ run: [] }>()

// ─── Step definitions — urutan eksekusi nyata dari sp_refresh_mutasi_weld ────

interface StepDef {
  id: string
  spStep: string      // nomor step pada stored procedure (bisa desimal)
  icon: string
  name: string
  desc: string
  tables: string[]
  output: string
  configKeys: string[]
  isNew?: boolean     // prosedur baru yang belum ada di pipeline lama
}

const STEPS: StepDef[] = [
  // ── Step 1: Seed ──────────────────────────────────────────────────────────
  {
    id: 'step1_seed',
    spStep: '1',
    icon: 'box',
    name: 'Seed Data Part',
    desc: 'Mengambil semua part welding aktif dari master data dan mencocokkan dengan stok penutupan (shift malam, hari terakhir) bulan sebelumnya di mutasi_weld sebagai titik awal kalkulasi.',
    tables: ['ms_welding', 'mutasi_weld (bulan lalu)'],
    output: 'Daftar lengkap part welding beserta stok awal yang akan dikalkulasi seluruh pipeline-nya.',
    configKeys: [],
  },
  // ── Step 2: MDFO ──────────────────────────────────────────────────────────
  {
    id: 'step2_mdfo',
    spStep: '2',
    icon: 'calendar-stats',
    name: 'Terapkan Forecast MDFO',
    desc: 'Membaca data MDFO (forecast kebutuhan harian) dari tabel majsf_inventory.mdfo dan mengisi kolom mdfo di mutasi_weld. MDFO adalah perkiraan, bukan order fix.',
    tables: ['majsf_inventory.mdfo', 'mutasi_weld'],
    output: 'Kolom mdfo di mutasi_weld terisi dengan estimasi kebutuhan per hari — dipakai sebagai referensi awal planning sebelum DN fix masuk.',
    configKeys: [],
  },
  // ── Step 3: Jadwal DN ─────────────────────────────────────────────────────
  {
    id: 'step3_dn',
    spStep: '3',
    icon: 'truck-delivery',
    name: 'Terapkan Jadwal DN (Order Fix)',
    desc: 'Memasukkan jadwal DN (Delivery Note) yang sudah dikonfirmasi — ini adalah order AKTUAL/FIX, bukan forecast. Nilai DN menimpa forecast MDFO dan menjadi prioritas utama yang tidak diubah kalkulasi otomatis.',
    tables: ['mieruka_delivery', 'mutasi_weld'],
    output: 'Kolom dn di mutasi_weld terisi nilai order yang sudah fix — menjadi acuan wajib dalam seluruh horizon planning.',
    configKeys: [],
  },
  // ── Step 3.5: Anomaly Detection ───────────────────────────────────────────
  {
    id: 'step3_5_anomaly',
    spStep: '3.5',
    icon: 'activity',
    name: 'Deteksi Anomali DN',
    desc: 'Menganalisis statistik jadwal DN untuk mendeteksi pola tidak normal: spike (lonjakan mendadak), drop (penurunan tiba-tiba), dan miss streak (absensi beruntun).',
    tables: ['mieruka_delivery'],
    output: 'Flag anomali per part — SPIKE, DROP, MISS_STREAK, atau NORMAL — untuk digunakan di langkah prioritas dan alert.',
    configKeys: [],
    isNew: true,
  },
  // ── Step 4: LKH Plan ─────────────────────────────────────────────────────
  {
    id: 'step4_lkh',
    spStep: '4',
    icon: 'calendar-month',
    name: 'Buat Jadwal LKH',
    desc: 'Membuat jadwal produksi LKH (Lembar Kerja Harian) untuk setiap hari kerja dalam horizon planning ke depan.',
    tables: ['workdays_group', 'workdays_header', 'mutasi_weld'],
    output: 'Draft jadwal produksi per part per hari kerja selama horizon planning.',
    configKeys: ['planning_horizon_days'],
  },
  // ── Step 5: Data Aktual ───────────────────────────────────────────────────
  {
    id: 'step5_actual',
    spStep: '5',
    icon: 'chart-bar',
    name: 'Ambil Data Aktual',
    desc: 'Mengambil histori produksi aktual dari tabel achievement untuk digunakan sebagai dasar kalkulasi rata-rata dan pola produksi.',
    tables: ['welding_achievement'],
    output: 'Histori produksi aktual per part dalam periode lookback yang akan dianalisis.',
    configKeys: ['achievement_lookback_days'],
  },
  // ── Step 5.5: Pcs/Day ─────────────────────────────────────────────────────
  {
    id: 'step5_5_pcsday',
    spStep: '5.5',
    icon: 'calculator',
    name: 'Hitung Pcs/Hari',
    desc: 'Menghitung rata-rata produksi per hari menggunakan rolling window per minggu ISO. Hasil ini menjadi fondasi estimasi kapasitas yang dibutuhkan.',
    tables: ['mutasi_weld', 'workdays_group'],
    output: 'Nilai pcs/hari per part per minggu — rata-rata produksi harian yang realistis.',
    configKeys: ['pcs_day_period_days', 'pcs_day_divisor_mode', 'pcs_day_minimum'],
    isNew: true,
  },
  // ── Step 5.7: Priority Scoring ────────────────────────────────────────────
  {
    id: 'step5_7_priority',
    spStep: '5.7',
    icon: 'sort-descending',
    name: 'Skoring Prioritas Part',
    desc: 'Menghitung skor prioritas untuk setiap part berdasarkan kondisi stok, urgensi DN, dan anomali terdeteksi. Part KRITIS mendapat skor tertinggi.',
    tables: ['mutasi_weld'],
    output: 'Skor prioritas per part yang menentukan urutan kapasitas mesin didistribusikan.',
    configKeys: ['safety_stock_days', 'safety_stock_warning_days'],
    isNew: true,
  },
  // ── Step 5.8: Long-range Demand ───────────────────────────────────────────
  {
    id: 'step5_8_longrange',
    spStep: '5.8',
    icon: 'timeline',
    name: 'Proyeksi Kebutuhan Jangka Panjang',
    desc: 'Menghitung estimasi total kebutuhan produksi untuk sisa bulan berjalan berdasarkan pola pengiriman DN dan tren stok historis.',
    tables: ['mutasi_weld', 'mieruka_delivery'],
    output: 'Proyeksi kebutuhan produksi kumulatif sisa bulan per part — untuk antisipasi bottleneck.',
    configKeys: ['planning_horizon_days'],
    isNew: true,
  },
  // ── Step 6 (1st call): Rolling Stock Awal ────────────────────────────────
  {
    id: 'step6_finish_1',
    spStep: '6',
    icon: 'rotate-clockwise',
    name: 'Hitung Rolling Stok (Pertama)',
    desc: 'Menghitung proyeksi stok bergulir (rolling stock) per shift per part — memperkirakan kondisi stok di setiap hari ke depan sebelum Smart Planning dijalankan.',
    tables: ['mutasi_weld'],
    output: 'Proyeksi stok harian per part — stok hari ini menjadi acuan kalkulasi stok hari berikutnya.',
    configKeys: [],
  },
  // ── Step 7: Smart Planning ────────────────────────────────────────────────
  {
    id: 'step7_adjust',
    spStep: '7',
    icon: 'cpu',
    name: 'Smart Planning (CLAMP)',
    desc: 'Menghitung qty produksi optimal per shift menggunakan logika CLAMP — memastikan produksi tidak melebihi kapasitas mesin, tidak kurang dari kebutuhan minimum, dan memprioritaskan part KRITIS.',
    tables: ['mutasi_weld'],
    output: 'Nilai plan_day dan plan_night per part per hari yang sudah dikalibrasi terhadap kapasitas dan prioritas.',
    configKeys: ['strength_shift1_hours', 'strength_shift2_hours', 'strength_overtime_max_hours', 'strength_efficiency_rate'],
  },
  // ── Step 7.5: Achievement Pattern ────────────────────────────────────────
  {
    id: 'step7_5_ach_pattern',
    spStep: '7.5',
    icon: 'chart-histogram',
    name: 'Analisis Pola Achievement',
    desc: 'Membangun pola achievement rate per hari dalam seminggu — misal Senin rata-rata 85%, Jumat rata-rata 70%. Pola ini dipakai untuk koreksi jadwal yang lebih akurat dari sekadar rata-rata global.',
    tables: ['welding_achievement', 'mutasi_weld'],
    output: 'Tabel pola achievement rate per hari-dalam-seminggu per part.',
    configKeys: ['achievement_rate_min', 'achievement_rate_max', 'achievement_lookback_days'],
    isNew: true,
  },
  // ── Step 8: Safety Net ────────────────────────────────────────────────────
  {
    id: 'step8_predict',
    spStep: '8',
    icon: 'shield-check',
    name: 'Safety Net & Koreksi Akhir',
    desc: 'Menerapkan koreksi terakhir pada jadwal berdasarkan pola achievement dan batas safety stock. Part yang berisiko tidak tercapai mendapat penyesuaian qty plan.',
    tables: ['mutasi_weld'],
    output: 'Jadwal produksi yang sudah diproteksi safety net — tidak ada part KRITIS yang lolos tanpa produksi.',
    configKeys: ['achievement_rate_min', 'achievement_rate_max', 'safety_stock_days'],
  },
  // ── Step 6 (2nd call): Rolling Stock Final ────────────────────────────────
  {
    id: 'step6_finish_2',
    spStep: '6★',
    icon: 'rotate-clockwise',
    name: 'Hitung Rolling Stok (Final)',
    desc: 'Menjalankan ulang kalkulasi rolling stock setelah semua koreksi diterapkan — menghasilkan proyeksi stok final yang akurat dan konsisten dengan jadwal akhir.',
    tables: ['mutasi_weld'],
    output: 'Proyeksi stok final — digunakan untuk menentukan status stok KRITIS / WASPADA / NORMAL.',
    configKeys: [],
  },
  // ── Step 8.5: Miss Pattern ────────────────────────────────────────────────
  {
    id: 'step8_5_miss',
    spStep: '8.5',
    icon: 'alert-circle',
    name: 'Deteksi Pola Miss Kronis',
    desc: 'Mengidentifikasi part yang secara kronis sering tidak mencapai target produksi (chronic miss). Part-part ini ditandai khusus untuk perhatian supervisor.',
    tables: ['welding_achievement', 'mutasi_weld'],
    output: 'Daftar part dengan pola chronic miss beserta tingkat keparahan (ringan / sedang / parah).',
    configKeys: ['achievement_lookback_days'],
    isNew: true,
  },
  // ── Step 8.9: Alerts ──────────────────────────────────────────────────────
  {
    id: 'step8_9_alerts',
    spStep: '8.9',
    icon: 'bell-ringing',
    name: 'Generate Alert & Notifikasi',
    desc: 'Membuat alert otomatis untuk kondisi yang memerlukan tindakan segera: stok kritis, anomali DN terdeteksi, dan part dengan chronic miss.',
    tables: ['mutasi_weld'],
    output: 'Tabel alert siap tampil di dashboard — dengan level CRITICAL / WARNING / INFO per part.',
    configKeys: [],
    isNew: true,
  },
]

// ─── State ────────────────────────────────────────────────────────────────────

const openIdx = ref<number | null>(0)

// Animasi step satu-per-satu saat running selesai
const animatedIdx = ref(-1)

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(() => props.steps, (steps) => {
  if (!steps.length) return
  // Replay animasi: highlight step satu per satu
  animatedIdx.value = -1
  let i = 0
  const tick = () => {
    if (i >= steps.length) return
    animatedIdx.value = i
    i++
    setTimeout(tick, 280)
  }
  setTimeout(tick, 200)
})

// ─── Computed ─────────────────────────────────────────────────────────────────

const progressPct = computed(() => {
  if (!props.running) return 0
  const done = props.steps.length
  return Math.min(100, (done / STEPS.length) * 100)
})

const okCount    = computed(() => props.steps.filter(s => s.status === 'OK').length)
const skipCount  = computed(() => props.steps.filter(s => s.status === 'SKIP').length)
const errorCount = computed(() => props.steps.filter(s => s.status === 'ERROR').length)
const totalRows  = computed(() => props.steps.reduce((sum, s) => sum + (s.rows ?? 0), 0))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getResultStep(idx: number): PipelineStep | null {
  return props.steps[idx] ?? null
}

type StepState = 'idle' | 'running' | 'done-ok' | 'done-skip' | 'done-error' | 'animated'

function getStepState(idx: number): StepState {
  const result = getResultStep(idx)
  if (!result) {
    if (props.running && props.steps.length === idx) return 'running'
    return 'idle'
  }
  if (result.status === 'ERROR') return 'done-error'
  if (result.status === 'SKIP')  return 'done-skip'
  return 'done-ok'
}

function getStepClass(idx: number): string {
  const state = getStepState(idx)
  return `pf-step--${state}`
}

function getBulletClass(idx: number): string {
  const state = getStepState(idx)
  return `pf-bullet--${state}`
}

function getConnectorClass(idx: number): string {
  const result = getResultStep(idx)
  if (!result) return ''
  if (result.status === 'SKIP') return 'pf-connector--skipped'
  if (animatedIdx.value > idx) return 'pf-connector--filled'
  return ''
}

function toggleDetail(idx: number) {
  openIdx.value = openIdx.value === idx ? null : idx
}
</script>

<style scoped>
.pipeline-flow {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────────────────────── */
.pf-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  flex-wrap: wrap;
}

.pf-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 3px;
}

.pf-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  max-width: 480px;
}

.pf-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.last-run-info {
  font-size: 11px;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.pf-run-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 500;
  background: var(--color-text-primary);
  color: var(--color-background-primary);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.pf-run-btn:hover:not(:disabled) { opacity: 0.85; }
.pf-run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pf-run-btn--running { background: var(--color-text-info, #3b82f6); }

/* ── Progress bar ───────────────────────────────────────────────────────────── */
.pf-progress-bar {
  height: 3px;
  background: var(--color-border-tertiary);
}
.pf-progress-fill {
  height: 100%;
  background: var(--color-text-info, #3b82f6);
  transition: width 0.4s ease;
}

/* ── Timeline ───────────────────────────────────────────────────────────────── */
.pf-timeline {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pf-step {
  display: flex;
  gap: 0;
  align-items: flex-start;
  position: relative;
  cursor: pointer;
  padding: 0.625rem 0.75rem;
  border-radius: var(--border-radius-md);
  transition: background 0.12s;
}
.pf-step:hover { background: var(--color-background-secondary); }

/* ── Connector ──────────────────────────────────────────────────────────────── */
.pf-connector {
  position: absolute;
  left: calc(0.75rem + 14px); /* center of bullet: padding(12px) + half-bullet(14px) */
  top: calc(0.625rem + 28px); /* below the bullet */
  width: 2px;
  height: calc(100% - 4px);
  background: var(--color-border-tertiary, #e5e7eb);
  transition: background 0.3s;
  border-radius: 1px;
}
.pf-connector--filled {
  background: #22c55e;
}
.pf-connector--skipped {
  background: var(--color-border-secondary, #d1d5db);
  background-image: repeating-linear-gradient(
    to bottom,
    var(--color-border-secondary, #d1d5db) 0,
    var(--color-border-secondary, #d1d5db) 4px,
    transparent 4px,
    transparent 8px
  );
}

/* ── Bullet ─────────────────────────────────────────────────────────────────── */
.pf-bullet {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  margin-right: 14px;
  margin-top: 1px;
  z-index: 1;
  transition: box-shadow 0.2s, background 0.2s, color 0.2s;
  /* Use box-shadow ring instead of border — avoids global CSS reset * { border-width: 0 } */
  box-shadow: 0 0 0 2px var(--color-border-secondary, #d1d5db);
  background: var(--color-background-primary, #fff);
  color: var(--color-text-tertiary, #9ca3af);
}

.pf-bullet--idle {
  box-shadow: 0 0 0 2px var(--color-border-tertiary, #e5e7eb);
  background: var(--color-background-secondary, #f9fafb);
  color: var(--color-text-tertiary, #9ca3af);
}

.pf-bullet--running {
  box-shadow: 0 0 0 2px #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
}

.pf-bullet--done-ok {
  box-shadow: 0 0 0 2px #22c55e;
  background: #f0fdf4;
  color: #16a34a;
}

.pf-bullet--done-skip {
  box-shadow: 0 0 0 2px var(--color-border-secondary, #d1d5db);
  background: var(--color-background-secondary, #f9fafb);
  color: var(--color-text-tertiary, #9ca3af);
}

.pf-bullet--done-error {
  box-shadow: 0 0 0 2px #ef4444;
  background: #fef2f2;
  color: #dc2626;
}

.pf-bullet--animated {
  box-shadow: 0 0 0 2px #22c55e;
  background: #f0fdf4;
  color: #16a34a;
}

/* ── Step content ───────────────────────────────────────────────────────────── */
.pf-step-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 6px;
}

.pf-step-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pf-step-number {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.pf-badge-new {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: #fef3c7;
  color: #b45309;
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.pf-step-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
}

.pf-chevron {
  font-size: 14px;
  color: var(--color-text-tertiary);
  margin-left: auto;
  flex-shrink: 0;
}

.pf-step-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-top: 3px;
}

/* ── Badge ──────────────────────────────────────────────────────────────────── */
.pf-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
}
.pf-badge--ok {
  background: color-mix(in srgb, var(--color-text-success, #22c55e) 12%, transparent);
  color: var(--color-text-success, #22c55e);
}
.pf-badge--skip {
  background: var(--color-background-secondary, #f3f4f6);
  color: var(--color-text-tertiary, #9ca3af);
  box-shadow: 0 0 0 1px var(--color-border-tertiary, #e5e7eb);
}

.pf-badge--error {
  background: color-mix(in srgb, var(--color-text-danger, #ef4444) 12%, transparent);
  color: var(--color-text-danger, #ef4444);
}

/* ── Expanded detail ────────────────────────────────────────────────────────── */
.pf-step-detail {
  margin-top: 10px;
  padding: 12px;
  background: var(--color-background-secondary);
  border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pf-detail-section {}

.pf-detail-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.pf-step-output {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.pf-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pf-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
}

.pf-tag--table {
  background: #eff6ff;
  color: #2563eb;
  box-shadow: 0 0 0 1px #bfdbfe;
  font-family: var(--font-mono, monospace);
}

.pf-tag--config {
  background: #fffbeb;
  color: #b45309;
  box-shadow: 0 0 0 1px #fde68a;
  font-family: var(--font-mono, monospace);
}

.pf-params-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pf-param-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 6px;
  padding: 3px 8px;
  color: var(--color-text-secondary);
}

.pf-param-item code {
  font-family: var(--font-mono, monospace);
  color: var(--color-text-info, #3b82f6);
  font-size: 10px;
}

/* ── Summary ────────────────────────────────────────────────────────────────── */
.pf-summary {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1.5rem;
  border-top: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-secondary);
  flex-wrap: wrap;
}

.pf-summary-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.pf-summary-stat--ok    { color: var(--color-text-success, #22c55e); }
.pf-summary-stat--skip  { color: var(--color-text-tertiary, #9ca3af); }
.pf-summary-stat--error { color: var(--color-text-danger, #ef4444); }

/* ── Animations ─────────────────────────────────────────────────────────────── */
.expand-enter-active, .expand-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 600px;
  opacity: 1;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 1s linear infinite; }
</style>
