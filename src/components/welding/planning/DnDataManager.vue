<template>
  <!-- DnDataManager.vue
       Read-only view jadwal DN (Delivery Note) dari majsf_inventory.mieruka_delivery
       DN = order AKTUAL/FIX dari SAP — bukan forecast.
       Tampilan: grid spreadsheet — baris = part, kolom = hari 1–31 -->
  <div class="dn">

    <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
    <div class="dn-toolbar">
      <div class="dn-toolbar-left">
        <select v-model.number="filterYear" class="dn-select" @change="load">
          <option v-for="y in yearOpts" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model.number="filterMonth" class="dn-select" @change="load">
          <option v-for="m in 12" :key="m" :value="m">{{ monthLabel(m) }}</option>
        </select>
        <select v-model="filterArea" class="dn-select" @change="load">
          <option value="">Semua Area</option>
          <option v-for="a in AREAS" :key="a" :value="a">{{ a }}</option>
        </select>
        <input
          v-model="filterQ"
          class="dn-search"
          type="text"
          placeholder="Cari part number…"
          @input="onSearch"
        />
        <button class="btn btn--outline btn--sm" :disabled="loading" @click="load">
          <i class="ti ti-refresh" /> Muat
        </button>
      </div>
      <div class="dn-toolbar-right">
        <span class="dn-period-chip">
          <i class="ti ti-calendar-month" />
          Periode: <strong>{{ spmonDisplay }}</strong>
          · {{ daysInMonth }} hari
        </span>
        <span class="dn-stat-chip dn-stat-chip--blue">
          <i class="ti ti-truck-delivery" />
          {{ rows.length }} part · {{ totalQtyAll.toLocaleString('id') }} pcs
        </span>
      </div>
    </div>

    <!-- ── Info banner ──────────────────────────────────────────────────── -->
    <div class="dn-info">
      <i class="ti ti-info-circle" />
      <span>
        <strong>DN = Delivery Note (Order Fix)</strong> — data aktual dari SAP, bersifat
        <em>read-only</em>. Step 3 pipeline membaca <code>MATNR / BSTDK / KWMENG / ETD</code>
        dari <code>mieruka_delivery</code>, lalu mengisi <code>dn, dn_day, dn_night</code>
        di mutasi_weld. Siang: ETD 07:15–19:59 · Malam: lainnya.
      </span>
    </div>

    <!-- ── Anomaly summary (bila ada) ───────────────────────────────────── -->
    <div v-if="Object.keys(anomalySummary).length > 0" class="dn-anomaly-bar">
      <i class="ti ti-activity" />
      <span class="dn-anomaly-label">Anomali terdeteksi (Step 3.5):</span>
      <span
        v-for="(cnt, type) in anomalySummary" :key="type"
        class="dn-anomaly-chip"
        :class="{
          'dn-anomaly-chip--spike'  : type === 'DN_SPIKE',
          'dn-anomaly-chip--drop'   : type === 'DN_DROP',
          'dn-anomaly-chip--mismatch': type === 'MDFO_MISMATCH',
          'dn-anomaly-chip--miss'   : type === 'PLAN_MISS_STREAK',
        }"
      >
        {{ type.replace('_', ' ') }} <strong>{{ cnt }}</strong>
      </span>
    </div>

    <!-- ── Loading / empty ──────────────────────────────────────────────── -->
    <div v-if="loading" class="dn-loading">
      <i class="ti ti-loader-2 spin" /> Memuat data DN…
    </div>
    <div v-else-if="error" class="dn-error">
      <i class="ti ti-alert-circle" /> {{ error }}
    </div>
    <div v-else-if="rows.length === 0" class="dn-empty">
      <i class="ti ti-inbox" />
      <p>Tidak ada data DN untuk periode <strong>{{ spmonDisplay }}</strong>.</p>
      <p class="dn-empty-hint">DN diambil otomatis dari SAP via tabel <code>mieruka_delivery</code>.</p>
    </div>

    <!-- ── Grid (spreadsheet) ───────────────────────────────────────────── -->
    <div v-else class="dn-grid-wrap">
      <table class="dn-grid">
        <thead>
          <tr>
            <th class="dn-col-part sticky-col-1">Part Number</th>
            <th class="dn-col-name sticky-col-2">Nama Part</th>
            <th class="dn-col-area">Area</th>
            <!-- Kolom hari 1–31 -->
            <th
              v-for="d in 31"
              :key="d"
              class="dn-col-day"
              :class="{ 'dn-col-day--out': d > daysInMonth }"
            >{{ d }}</th>
            <th class="dn-col-total">Total</th>
          </tr>
          <!-- Sub-header shift -->
          <tr class="dn-shift-header">
            <th class="sticky-col-1"></th>
            <th class="sticky-col-2"></th>
            <th></th>
            <th
              v-for="d in 31"
              :key="d"
              class="dn-col-day dn-shift-cell"
              :class="{ 'dn-col-day--out': d > daysInMonth }"
            >
              <span v-if="d <= daysInMonth" class="dn-shift-labels">
                <span class="dn-shift-d" title="Siang">S</span>
                <span class="dn-shift-n" title="Malam">M</span>
              </span>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.part_number" class="dn-row">
            <td class="dn-col-part sticky-col-1 dn-pn">{{ row.part_number }}</td>
            <td class="dn-col-name sticky-col-2 dn-pname">{{ row.part_name || '—' }}</td>
            <td class="dn-col-area">
              <span v-if="row.area_code" class="dn-area-badge">{{ row.area_code }}</span>
              <span v-else class="dn-area-none">—</span>
            </td>
            <!-- Day cells -->
            <td
              v-for="d in 31"
              :key="d"
              class="dn-col-day dn-day-cell"
              :class="{
                'dn-col-day--out': d > daysInMonth,
                'dn-day-cell--has': getDayQty(row.part_number, d) > 0,
              }"
            >
              <template v-if="d <= daysInMonth && getDayQty(row.part_number, d) > 0">
                <div class="dn-day-total">{{ fmtQty(getDayQty(row.part_number, d)) }}</div>
                <div class="dn-day-shifts">
                  <span class="dn-shift-d" :class="{ 'dn-shift--zero': getDayShift(row.part_number, d, 'day') === 0 }">
                    {{ fmtQty(getDayShift(row.part_number, d, 'day')) }}
                  </span>
                  <span class="dn-shift-n" :class="{ 'dn-shift--zero': getDayShift(row.part_number, d, 'night') === 0 }">
                    {{ fmtQty(getDayShift(row.part_number, d, 'night')) }}
                  </span>
                </div>
              </template>
              <template v-else-if="d <= daysInMonth">
                <span class="dn-day-zero">—</span>
              </template>
            </td>
            <!-- Row total -->
            <td class="dn-col-total dn-row-total">
              {{ fmtQty(row.total_qty) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="dn-footer">
            <td class="sticky-col-1" colspan="2"><strong>Total</strong></td>
            <td></td>
            <td
              v-for="d in 31"
              :key="d"
              class="dn-col-day dn-foot-cell"
              :class="{ 'dn-col-day--out': d > daysInMonth }"
            >
              <span v-if="d <= daysInMonth && colTotal(d) > 0">{{ fmtQty(colTotal(d)) }}</span>
            </td>
            <td class="dn-col-total dn-foot-grand">
              <strong>{{ fmtQty(totalQtyAll) }}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const BASE  = 'http://192.168.10.67/majsf_rest_api/api/planning-cms'
const AREAS = ['KD1', 'KD2', 'KD3', 'KD4', 'KD5', 'KD6', 'KD7', 'KD8']

// ── State ────────────────────────────────────────────────────────────────────
const now         = new Date()
const filterYear  = ref(now.getFullYear())
const filterMonth = ref(now.getMonth() + 1)
const filterArea  = ref('')
const filterQ     = ref('')

const loading       = ref(false)
const error         = ref<string | null>(null)
const rows          = ref<any[]>([])
const dailyMap      = ref<Record<string, Record<number, { qty: number; qty_day: number; qty_night: number }>>>({})
const anomalySummary = ref<Record<string, number>>({})

let searchTimer: ReturnType<typeof setTimeout> | null = null

// ── Derived ──────────────────────────────────────────────────────────────────
const spmonDisplay = computed(() => {
  const m = String(filterMonth.value).padStart(2, '0')
  return `${filterYear.value}-${m}`
})

const daysInMonth = computed(() => {
  return new Date(filterYear.value, filterMonth.value, 0).getDate()
})

const yearOpts = computed(() => {
  const y = now.getFullYear()
  return [y - 1, y, y + 1]
})

const totalQtyAll = computed(() =>
  rows.value.reduce((s, r) => s + (r.total_qty || 0), 0)
)

// ── Helpers ──────────────────────────────────────────────────────────────────
function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString('id-ID', { month: 'long' })
}

function fmtQty(v: number) {
  if (!v || v === 0) return '0'
  return v % 1 === 0 ? v.toLocaleString('id') : v.toFixed(1)
}

function getDayQty(partNumber: string, day: number): number {
  return dailyMap.value[partNumber]?.[day]?.qty ?? 0
}

function getDayShift(partNumber: string, day: number, shift: 'day' | 'night'): number {
  const cell = dailyMap.value[partNumber]?.[day]
  if (!cell) return 0
  return shift === 'day' ? cell.qty_day : cell.qty_night
}

function colTotal(day: number): number {
  let sum = 0
  for (const pn of Object.keys(dailyMap.value)) {
    sum += dailyMap.value[pn][day]?.qty ?? 0
  }
  return sum
}

// ── Data fetching ────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value   = null
  try {
    const params: any = {
      year:  filterYear.value,
      month: filterMonth.value,
      limit: 300,
    }
    if (filterArea.value) params.area = filterArea.value
    if (filterQ.value)    params.q    = filterQ.value

    const { data } = await axios.get(`${BASE}/dn-schedule`, { params })
    if (data.success) {
      rows.value          = data.data            || []
      dailyMap.value      = data.daily           || {}
      anomalySummary.value = data.anomaly_summary || {}
    } else {
      error.value = data.message || 'Gagal memuat data DN.'
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Gagal memuat data DN.'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 400)
}

onMounted(load)
</script>

<style scoped>
/* ── Container ──────────────────────────────────────────────────────────────── */
.dn { display: flex; flex-direction: column; gap: 12px; }

/* ── Toolbar ────────────────────────────────────────────────────────────────── */
.dn-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 8px;
}
.dn-toolbar-left, .dn-toolbar-right {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.dn-select {
  height: 32px; padding: 0 8px; border-radius: 6px;
  border: 1px solid var(--c-border, #e2e8f0); font-size: 13px;
  background: var(--c-bg-card, #fff);
}
.dn-search {
  height: 32px; padding: 0 10px; border-radius: 6px;
  border: 1px solid var(--c-border, #e2e8f0); font-size: 13px;
  width: 180px; background: var(--c-bg-card, #fff);
}

/* ── Chips ──────────────────────────────────────────────────────────────────── */
.dn-period-chip, .dn-stat-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 20px; font-size: 12px;
  background: var(--c-bg-subtle, #f8fafc);
  border: 1px solid var(--c-border, #e2e8f0); color: var(--c-text-2, #64748b);
}
.dn-stat-chip--blue { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }

/* ── Info banner ────────────────────────────────────────────────────────────── */
.dn-info {
  display: flex; align-items: flex-start; gap: 8px;
  background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;
  padding: 10px 14px; font-size: 12.5px; color: #0c4a6e; line-height: 1.5;
}
.dn-info i { margin-top: 1px; flex-shrink: 0; font-size: 16px; color: #0284c7; }
.dn-info code { background: #e0f2fe; padding: 1px 5px; border-radius: 3px; }

/* ── Anomaly bar ────────────────────────────────────────────────────────────── */
.dn-anomaly-bar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
  padding: 8px 14px; font-size: 12.5px; color: #78350f;
}
.dn-anomaly-bar i { color: #d97706; font-size: 16px; }
.dn-anomaly-label { font-weight: 600; }
.dn-anomaly-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 500;
  background: #fef3c7; border: 1px solid #fde68a; color: #92400e;
}
.dn-anomaly-chip--spike   { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
.dn-anomaly-chip--drop    { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
.dn-anomaly-chip--mismatch { background: #f3e8ff; border-color: #d8b4fe; color: #6b21a8; }
.dn-anomaly-chip--miss    { background: #ffedd5; border-color: #fdba74; color: #9a3412; }

/* ── Loading / error / empty ────────────────────────────────────────────────── */
.dn-loading, .dn-error, .dn-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; padding: 40px 20px;
  color: var(--c-text-2, #64748b); font-size: 14px; text-align: center;
}
.dn-error { color: #dc2626; }
.dn-error i, .dn-loading i { font-size: 28px; }
.dn-empty i { font-size: 36px; opacity: .4; }
.dn-empty-hint { font-size: 12px; opacity: .6; }

/* ── Grid wrapper ───────────────────────────────────────────────────────────── */
.dn-grid-wrap {
  overflow-x: auto; border-radius: 10px;
  border: 1px solid var(--c-border, #e2e8f0);
  background: var(--c-bg-card, #fff);
  max-height: 520px; overflow-y: auto;
}

/* ── Table ──────────────────────────────────────────────────────────────────── */
.dn-grid {
  border-collapse: separate; border-spacing: 0;
  font-size: 11.5px; width: max-content; min-width: 100%;
}
.dn-grid thead tr:first-child th {
  position: sticky; top: 0; z-index: 4;
  background: #f8fafc; border-bottom: 1px solid #e2e8f0;
  padding: 6px 6px; font-weight: 600; white-space: nowrap;
  color: var(--c-text-1, #1e293b);
}
.dn-grid thead tr.dn-shift-header th {
  position: sticky; top: 29px; z-index: 3;
  background: #f1f5f9; border-bottom: 2px solid #e2e8f0;
  padding: 2px 4px; font-size: 10px; color: #64748b;
}

/* Sticky columns */
.sticky-col-1 {
  position: sticky !important; left: 0; z-index: 5 !important;
  background: inherit;
  box-shadow: 2px 0 4px rgba(0,0,0,.06);
}
.sticky-col-2 {
  position: sticky !important; left: 110px; z-index: 5 !important;
  background: inherit;
  box-shadow: 2px 0 4px rgba(0,0,0,.06);
}
thead .sticky-col-1, thead .sticky-col-2 { z-index: 6 !important; }

/* ── Column widths ──────────────────────────────────────────────────────────── */
.dn-col-part  { min-width: 110px; max-width: 110px; background: #f8fafc; }
.dn-col-name  { min-width: 140px; max-width: 180px; background: #f8fafc; }
.dn-col-area  { min-width: 54px; text-align: center; }
.dn-col-day   { min-width: 52px; text-align: center; padding: 0 2px; }
.dn-col-total { min-width: 68px; text-align: right; padding: 4px 8px; font-weight: 600; }

/* Out-of-month cols */
.dn-col-day--out { background: #f1f5f9; opacity: .4; pointer-events: none; }

/* ── Cell content ───────────────────────────────────────────────────────────── */
.dn-pn    { font-family: monospace; font-size: 11px; padding: 5px 8px; }
.dn-pname { font-size: 11px; padding: 5px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dn-area-badge {
  display: inline-block; background: #e0f2fe; color: #0369a1;
  border-radius: 4px; padding: 1px 5px; font-size: 10px; font-weight: 600;
}
.dn-area-none { color: #cbd5e1; }

/* ── Day cell ───────────────────────────────────────────────────────────────── */
.dn-day-cell { padding: 2px 2px; vertical-align: middle; }
.dn-day-cell--has { background: #f0fdf4; }

.dn-day-total {
  font-size: 11.5px; font-weight: 700; color: #15803d;
  line-height: 1.1; text-align: center;
}
.dn-day-shifts {
  display: flex; justify-content: center; gap: 2px;
  font-size: 9.5px; margin-top: 1px;
}
.dn-day-zero { color: #cbd5e1; font-size: 10px; }

/* ── Shift labels ───────────────────────────────────────────────────────────── */
.dn-shift-labels { display: flex; justify-content: space-around; width: 100%; }
.dn-shift-d { color: #f59e0b; font-size: 9px; font-weight: 700; }
.dn-shift-n { color: #6366f1; font-size: 9px; font-weight: 700; }
.dn-shift--zero { opacity: .25; }

/* ── Footer ─────────────────────────────────────────────────────────────────── */
.dn-footer { background: #f8fafc; }
.dn-footer td {
  position: sticky; bottom: 0; background: #f8fafc;
  border-top: 2px solid #e2e8f0; padding: 4px 6px; font-size: 11.5px;
}
.dn-foot-cell { text-align: center; color: #64748b; font-weight: 600; }
.dn-foot-grand { text-align: right; padding-right: 8px; font-size: 13px; color: #15803d; }
.dn-row-total { color: #15803d; }

/* ── Tbody rows ─────────────────────────────────────────────────────────────── */
.dn-grid tbody tr:hover td { background: #f9fafb; }
.dn-grid tbody tr:hover .sticky-col-1,
.dn-grid tbody tr:hover .sticky-col-2 { background: #f1f5f9; }
.dn-grid tbody td {
  border-bottom: 1px solid #f1f5f9; padding: 4px 4px;
}

/* ── Row total ──────────────────────────────────────────────────────────────── */
.dn-col-total { background: #fafafa; }
</style>
