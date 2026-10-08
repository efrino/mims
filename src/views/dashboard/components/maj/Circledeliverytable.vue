<template>
  <div class="circle-delivery-wrapper">
    <!-- Title bar -->
    <div class="cd-title-bar">
      <div class="cd-title-group">
        <span class="cd-title">CIRCLE DELIVERY {{ formattedDate }}</span>
        <span class="cd-clock">🕐 {{ currentTimeStr }}</span>
      </div>
      <div class="cd-legend">
        <span class="legend-item"><span class="dot dot-orange"></span> DELIVERY OPEN</span>
        <span class="legend-item"><span class="dot dot-green"></span> DELIVERY CLOSE</span>
        <span class="legend-item"><span class="dot dot-blue"></span> ADVANCE DELIVERY</span>
        <span class="legend-item"><span class="dot dot-brown"></span> MINUS DELIVERY</span>
        <span class="legend-item"><span class="dot dot-blink-green"></span> JAM LEWAT + DATA</span>
        <span class="legend-item"><span class="dot dot-blink-red"></span> JAM LEWAT - DATA</span>
      </div>
    </div>

    <!-- Row legend -->
    <div class="cd-row-legend">
      <span>P : PLAN CIRCLE DELIVERY</span>
      <span>C : CIRCLE DELIVERY</span>
      <span>AD : ACTUAL DELIVERY</span>
      <span>Σ : Σ ITEM</span>
    </div>

    <!-- Per-plant tables -->
    <div
      v-for="plant in plants"
      :key="plant.name"
      class="cd-plant-block"
    >
      <div class="cd-shift-block">
        <table class="cd-table">
          <thead>
            <!-- Row 1: Plant name + DAY SHIFT / NIGHT SHIFT -->
            <tr>
              <th class="th-plant" :rowspan="6">{{ plant.name }}</th>
              <th class="th-label"></th>
              <th
                class="th-shift"
                :colspan="plant.dayShift.slots.length"
              >DAY SHIFT</th>
              <th
                class="th-shift th-shift-night"
                :colspan="plant.nightShift.slots.length"
              >NIGHT SHIFT</th>
              <th class="th-total">TOTAL</th>
            </tr>
            <!-- Row 2: JAM header -->
            <tr>
              <th class="th-label th-jam">JAM</th>
              <th
                v-for="slot in plant.dayShift.slots"
                :key="'dh-' + slot.time"
                :class="getTimeHeaderClass(slot, plant)"
              >{{ slot.time }}</th>
              <th
                v-for="slot in plant.nightShift.slots"
                :key="'nh-' + slot.time"
                :class="getTimeHeaderClass(slot, plant)"
              >{{ slot.time }}</th>
              <th class="th-total-cell"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in ['C', 'P', 'AD', 'ΣI']" :key="row">
              <td class="td-label">{{ row }}</td>
              <!-- Day shift cells -->
              <td
                v-for="slot in plant.dayShift.slots"
                :key="'dc-' + slot.time + '-' + row"
                :class="getDataCellClass(plant, slot, row)"
              >{{ getCellValue(plant, slot.time, row) }}</td>
              <!-- Night shift cells -->
              <td
                v-for="slot in plant.nightShift.slots"
                :key="'nc-' + slot.time + '-' + row"
                :class="getDataCellClass(plant, slot, row)"
              >{{ getCellValue(plant, slot.time, row) }}</td>
              <!-- Total -->
              <td class="td-total">
                {{ row === 'C' ? '-' : getRowTotal(plant, row) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  /**
   * Array of plant delivery data.
   * Shape per item:
   * {
   *   name: 'ADM PLANT 5',
   *   dayShift:   { slots: [{ time: '07:40', highlight: false, status: null }] },
   *   nightShift: { slots: [{ time: '19:40', highlight: false, status: null }] },
   *   data: {
   *     '07:40': { C: 1, P: 14, AD: 14, 'ΣI': 42 },
   *     ...
   *   }
   * }
   */
  plantsData: { type: Array, default: () => [] },
  date:       { type: String, default: '' }
});

// ─── Reactive clock ───────────────────────────────────────────────────────────
const now = ref(new Date());
let clockTimer = null;

onMounted(() => {
  clockTimer = setInterval(() => { now.value = new Date(); }, 60_000);
});
onUnmounted(() => {
  clearInterval(clockTimer);
});

// ─── Computed ─────────────────────────────────────────────────────────────────
const formattedDate = computed(() => {
  if (props.date) return props.date;
  return now.value.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).toUpperCase();
});

const currentTimeStr = computed(() => {
  return now.value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
});

const plants = computed(() =>
  props.plantsData && props.plantsData.length > 0 ? props.plantsData : DEMO_DATA
);

// ─── Time helpers ─────────────────────────────────────────────────────────────
/**
 * Convert "HH:MM" string → total minutes since midnight.
 * Slot time >= "19:00" is night shift (same day), slot time < "07:00" is
 * next-day early morning — we treat it as 24h+ so ordering stays correct.
 */
function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  // Early-morning night shift slots (00:xx – 06:xx) belong to next calendar day
  const mins = h * 60 + m;
  return mins < 360 ? mins + 1440 : mins; // < 06:00 → add 24h
}

function nowMinutes() {
  const h = now.value.getHours();
  const m = now.value.getMinutes();
  const mins = h * 60 + m;
  return mins < 360 ? mins + 1440 : mins;
}

function isSlotPast(slot) {
  return toMinutes(slot.time) < nowMinutes();
}

function hasAnyData(plant, slotTime) {
  const d = plant.data?.[slotTime];
  if (!d) return false;
  return ['C', 'P', 'AD', 'ΣI'].some(k => {
    const v = Number(d[k]);
    return !isNaN(v) && v > 0;
  });
}

// ─── Class builders ───────────────────────────────────────────────────────────
function getTimeHeaderClass(slot, plant) {
  const classes = ['th-time'];

  if (slot.highlight) {
    classes.push('th-highlight');
    return classes;
  }

  if (isSlotPast(slot)) {
    if (hasAnyData(plant, slot.time)) {
      classes.push('th-blink-green');
    } else {
      classes.push('th-blink-red');
    }
  }
  // future slots: no extra class → default neutral style
  return classes;
}

function getDataCellClass(plant, slot, row) {
  const classes = ['td-cell'];

  if (slot.highlight) {
    classes.push('cell-highlight');
    return classes;
  }

  // Status-based coloring (from slot.status prop)
  const status = slot.status;
  if (status === 'open')    { classes.push('cell-open');    return classes; }
  if (status === 'close')   { classes.push('cell-close');   return classes; }
  if (status === 'advance') { classes.push('cell-advance'); return classes; }
  if (status === 'minus')   { classes.push('cell-minus');   return classes; }

  // Past-time coloring
  if (isSlotPast(slot)) {
    if (hasAnyData(plant, slot.time)) {
      classes.push('cell-past-data');
    } else {
      classes.push('cell-past-empty');
    }
  }

  return classes;
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
function getCellValue(plant, time, row) {
  const val = plant.data?.[time]?.[row];
  if (val === undefined || val === null || val === 0) return '';
  return val;
}

function getRowTotal(plant, row) {
  if (!plant.data) return '';
  let total = 0;
  for (const timeData of Object.values(plant.data)) {
    const v = timeData[row];
    if (v) total += Number(v);
  }
  return total || '';
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_DATA = [
  {
    name: 'ADM PLANT 5',
    dayShift: {
      slots: [
        { time: '07:40' }, { time: '08:00' }, { time: '09:00' },
        { time: '10:35' }, { time: '11:35' }, { time: '12:15' },
        { time: '13:00' }, { time: '14:20' }, { time: '15:00' },
        { time: '16:00' }, { time: '17:00', highlight: true }, { time: '18:00' }
      ]
    },
    nightShift: {
      slots: [
        { time: '19:40' }, { time: '20:50' }, { time: '21:00' },
        { time: '22:45' }, { time: '23:00' }, { time: '00:40' },
        { time: '01:00' }, { time: '02:45' }, { time: '03:15' },
        { time: '04:00' }, { time: '05:00' }, { time: '06:00' }
      ]
    },
    data: {
      '07:40': { C: 1,  P: 14, AD: 14, 'ΣI': 42 },
      '08:00': { C: 2,  P: 19, AD: 19, 'ΣI': 48 },
      '09:00': { C: 3,  P: 4,  AD: 4,  'ΣI': 21 },
      '10:35': { C: 4,  P: 7,  AD: 7,  'ΣI': 9  },
      '11:35': { C: 5,  P: 4,  AD: 4,  'ΣI': 24 },
      '12:15': { C: 6,  P: 10, AD: 10, 'ΣI': 31 },
      '14:20': { C: 7,  P: 14, AD: 14, 'ΣI': 43 },
      '19:40': { C: 8,  P: 4,  AD: 4,  'ΣI': 23 },
      '20:50': { C: 9,  P: 5,  AD: 5,  'ΣI': 27 },
      '22:45': { C: 10, P: 2,  AD: 2,  'ΣI': 22 },
      '00:40': { C: 11, P: 13, AD: 13, 'ΣI': 52 },
      '02:45': { C: 12, P: 3,  AD: 3,  'ΣI': 22 },
      '03:15': { C: 13, P: 1,  AD: 1,  'ΣI': 2  }
    }
  },
  {
    name: 'TMMIN',
    dayShift: {
      slots: [
        { time: '07:00' }, { time: '08:17' }, { time: '09:00' },
        { time: '10:00' }, { time: '11:43' }, { time: '12:00' },
        { time: '13:00' }, { time: '14:00' }, { time: '15:00' },
        { time: '16:39' }, { time: '17:00', highlight: true }, { time: '18:00' }
      ]
    },
    nightShift: {
      slots: [
        { time: '19:08' }, { time: '20:01' }, { time: '21:07' },
        { time: '22:59' }, { time: '23:00' }, { time: '00:00' },
        { time: '01:30' }, { time: '02:00' }, { time: '03:00' },
        { time: '04:00' }, { time: '05:00' }, { time: '06:00' }
      ]
    },
    data: {
      '08:17': { C: 1, P: 6, AD: 6,  'ΣI': 13 },
      '12:00': { C: 2, P: 8, AD: 8,  'ΣI': 18 },
      '16:39': { C: 3, P: 2, AD: 2,  'ΣI': 3  },
      '19:08': { C: 4, P: 6, AD: 6,  'ΣI': 16 },
      '20:01': { C: 5, P: 1, AD: 1,  'ΣI': 1  },
      '21:07': { C: 6, P: 1, AD: 1,  'ΣI': 2  },
      '22:59': { C: 7, P: 8, AD: 8,  'ΣI': 18 },
      '00:00': { C: 8, P: 5, AD: 5,  'ΣI': 10 }
    }
  }
];
</script>

<style scoped>
/* ── Wrapper ──────────────────────────────────────── */
.circle-delivery-wrapper {
  background: #0d1117;
  color: #e2e8f0;
  font-family: 'Segoe UI', Arial, sans-serif;
  border-radius: 8px;
  overflow: hidden;
  padding-bottom: 14px;
  width: 100%;
  margin-bottom: 16px; /* gap sebelum card per-customer */
}

/* ── Title bar ───────────────────────────────────── */
.cd-title-bar {
  background: #161b22;
  padding: 10px 16px 7px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #30363d;
}
.cd-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cd-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #ffffff;
}
.cd-clock {
  font-size: 12px;
  color: #7dd3fc;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

/* ── Legend ──────────────────────────────────────── */
.cd-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 10px;
  color: #94a3b8;
  letter-spacing: 0.04em;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.dot-orange      { background: #e67e22; }
.dot-green       { background: #27ae60; }
.dot-blue        { background: #2980b9; }
.dot-brown       { background: #795548; }
.dot-blink-green { background: #16a34a; animation: blink-green 1.2s ease-in-out infinite; }
.dot-blink-red   { background: #dc2626; animation: blink-red   1.2s ease-in-out infinite; }

/* ── Row legend ──────────────────────────────────── */
.cd-row-legend {
  padding: 4px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 9.5px;
  color: #64748b;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #21262d;
}

/* ── Plant block ─────────────────────────────────── */
.cd-plant-block {
  margin: 10px 12px 0;
}

/* ── Scroll container ────────────────────────────── */
.cd-shift-block {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid #30363d;
}

/* ── Table ───────────────────────────────────────── */
.cd-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  font-size: 11px;
  min-width: 900px;
}

/* Plant name column */
.th-plant {
  background: #1a2332;
  color: #e2e8f0;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  padding: 4px 10px;
  border: 1px solid #30363d;
  width: 90px;
}

/* DAY / NIGHT SHIFT header */
.th-shift {
  background: #1e3a5f;
  color: #7dd3fc;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-align: center;
  padding: 5px 4px;
  border: 1px solid #30363d;
}
.th-shift-night {
  background: #1a2d4a;
  color: #93c5fd;
}

/* JAM label */
.th-label {
  background: #161b22;
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  padding: 4px 6px;
  border: 1px solid #30363d;
  min-width: 36px;
  white-space: nowrap;
}
.th-jam {
  color: #94a3b8;
}

/* Time header cells */
.th-time {
  background: #1e293b;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  padding: 5px 2px;
  white-space: nowrap;
  border: 1px solid #30363d;
  min-width: 44px;
  transition: background 0.3s;
}

/* 17:00 orange highlight */
.th-highlight {
  background: #7c2d12 !important;
  color: #fed7aa !important;
  animation: none !important;
}

/* Past jam + ada data → kedip HIJAU */
.th-blink-green {
  animation: blink-green 1.2s ease-in-out infinite;
  color: #d1fae5 !important;
}

/* Past jam + tidak ada data → kedip MERAH */
.th-blink-red {
  animation: blink-red 1.2s ease-in-out infinite;
  color: #fee2e2 !important;
}

/* ── Row label td ────────────────────────────────── */
.td-label {
  background: #161b22;
  color: #94a3b8;
  font-weight: 600;
  text-align: center;
  font-size: 11px;
  padding: 4px 6px;
  border: 1px solid #21262d;
  white-space: nowrap;
}

/* ── Data cells ──────────────────────────────────── */
.td-cell {
  background: #0d1117;
  color: #e2e8f0;
  text-align: center;
  padding: 4px 3px;
  border: 1px solid #21262d;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* Past + ada data: subtle green tint, TIDAK kedip (header yg kedip) */
.cell-past-data {
  background: #052e16 !important;
  color: #bbf7d0 !important;
}

/* Past + kosong: subtle red tint */
.cell-past-empty {
  background: #1c0a0a !important;
  color: #fca5a5 !important;
}

/* Status-based (dari prop slot.status) */
.cell-highlight { background: #7c2d12 !important; color: #fed7aa !important; }
.cell-open      { background: #78350f !important; color: #fde68a !important; }
.cell-close     { background: #14532d !important; color: #86efac !important; }
.cell-advance   { background: #1e3a5f !important; color: #7dd3fc !important; }
.cell-minus     { background: #3b1f14 !important; color: #d6bfa8 !important; }

/* ── Total column ────────────────────────────────── */
.th-total {
  background: #1e293b;
  color: #7dd3fc;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  padding: 5px 6px;
  border: 1px solid #30363d;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.th-total-cell {
  background: #1e293b;
  border: 1px solid #30363d;
}
.td-total {
  background: #111827;
  color: #f1f5f9;
  font-weight: 700;
  text-align: center;
  padding: 4px 6px;
  border: 1px solid #30363d;
  font-size: 11px;
  min-width: 40px;
}

/* ── Keyframes ───────────────────────────────────── */
@keyframes blink-green {
  0%, 100% { background: #14532d; }
  50%       { background: #16a34a; }
}

@keyframes blink-red {
  0%, 100% { background: #450a0a; }
  50%       { background: #dc2626; }
}
</style>