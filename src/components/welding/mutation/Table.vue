<!-- components/welding/mutation/Table.vue -->
<template>
  <div class="bg-white rounded-lg shadow-lg overflow-hidden" style="flex:1; display:flex; flex-direction:column; min-height:0">
    <div ref="wrapRef" class="table-wrapper">
      <table class="planning-table">
        <TableHeader
          :max-days="maxDays"
          :current-year="currentYear"
          :current-month="currentMonth"
          :holidays="holidays"
          @open-filter="(field, event) => $emit('openFilter', field, event)"
        />
        <TableBody
          :jobs="jobs"
          :max-days="maxDays"
          :holidays="holidays"
          :current-year="currentYear"
          :current-month="currentMonth"
          :planning-v2="planningV2"
          @plan-cell-click="$emit('planCellClick', $event)"
          @initial-stock-open="$emit('initialStockOpen', $event)"
          @initial-stock-reset="$emit('initialStockReset', $event)"
          @stock-cell-click="$emit('stockCellClick', $event)"
          @shift-mode-change="$emit('shiftModeChange', $event)"
          @forecast-cell-click="$emit('forecastCellClick', $event)"
          @customer-cell-click="$emit('customerCellClick', $event)"
          @dn-cell-click="$emit('dnCellClick', $event)"
        />
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import TableHeader from './TableHeader.vue';
import TableBody from './TableBody.vue';
import type { Job, FilterField, DateData, MutasiKind } from '@/types/Public/Welding/planning';

interface Props {
  jobs: Job[];
  currentYear?: number;
  currentMonth?: number;
  planningV2?: boolean;
  holidays?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  currentYear: () => new Date().getFullYear(),
  currentMonth: () => new Date().getMonth() + 1
});

defineEmits<{
  openFilter:       [field: FilterField, event: MouseEvent];
  planCellClick:    [data: { kind: MutasiKind; partNo: string; partName: string; tanggal: number; dateData: DateData }];
  initialStockOpen: [job: Job];
  initialStockReset:[data: { kind: MutasiKind; partNo: string }];
  stockCellClick:   [data: { kind: MutasiKind; partNo: string; partName: string; tanggal: number; shift: 'day' | 'night'; currentStock: number; wasAdjusted: boolean; lastAdjustBy: string | null; lastAdjustAt: string | null; lastAdjustNote: string | null }];
  shiftModeChange:  [data: { kind: MutasiKind; partNo: string; mode: 'both' | 'day' | 'night'; scope: 'month' | 'date' }];
  forecastCellClick:[data: { partNo: string; partName: string; tanggal: number }];
  customerCellClick:[data: { job: Job; tanggal: number }];
  dnCellClick:      [data: { job: Job; tanggal: number; shift: 'day' | 'night'; dateData: DateData }];
}>();

const maxDays = computed(() => new Date(props.currentYear, props.currentMonth, 0).getDate());

// ── Scroll horizontal ke tanggal hari ini (default saat data periode ini tampil) ──
const wrapRef = ref<HTMLElement | null>(null);

/** Geser kolom `th[data-day=day]` tepat di kanan kolom sticky (sisakan 1 hari sebelumnya). */
function scrollToDay(day: number, smooth = true) {
  const wrap = wrapRef.value;
  const th = wrap?.querySelector<HTMLElement>(`thead th.date-header[data-day="${day}"]`);
  if (!wrap || !th) return;
  const sticky = [...wrap.querySelectorAll<HTMLElement>('thead tr:first-child th.sticky-col')]
    // offsetLeft elemen sticky ikut bergeser saat di-scroll → pakai `left` sticky-nya.
    // HP: kolom kiri tidak sticky (left: auto) → tidak menutupi tanggal.
    .filter(el => getComputedStyle(el).left !== 'auto')
    .reduce((mx, el) => Math.max(mx, (parseFloat(getComputedStyle(el).left) || 0) + el.offsetWidth), 0);
  const prev = wrap.querySelector<HTMLElement>(`thead th.date-header[data-day="${day - 1}"]`);
  const target = (prev ?? th).offsetLeft - sticky;
  wrap.scrollTo({ left: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
}

function isCurrentPeriod() {
  const now = new Date();
  return now.getFullYear() === props.currentYear && now.getMonth() + 1 === props.currentMonth;
}

/** Hari ini bila periode berjalan, selain itu tanggal 1. */
function scrollToToday(smooth = true) {
  if (isCurrentPeriod()) scrollToDay(new Date().getDate(), smooth);
  else wrapRef.value?.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' });
}

/** Geser 1 layar kolom tanggal ke kiri/kanan (shortcut keyboard). */
function scrollByPage(dir: 1 | -1) {
  const wrap = wrapRef.value;
  if (wrap) wrap.scrollBy({ left: dir * wrap.clientWidth * 0.6, behavior: 'smooth' });
}

// Sekali per periode: begitu baris pertama muncul, lompat ke hari ini.
let autoScrolledFor = '';
watch(
  () => [props.currentYear, props.currentMonth, props.jobs.length > 0] as const,
  async ([y, m, has]) => {
    const key = `${y}-${m}`;
    if (!has || autoScrolledFor === key) return;
    autoScrolledFor = key;
    await nextTick();
    requestAnimationFrame(() => scrollToToday(false));
  },
  { immediate: true },
);

defineExpose({ scrollToToday, scrollByPage });

</script>

<style scoped>
/* HP / tablet kecil: kolom kiri (NO..DESC) & TOTAL memenuhi layar bila sticky →
   lepas sticky horizontal; header tetap sticky di atas. Tabel ikut discroll ke hari ini. */
@media (max-width: 768px) {
  .planning-table :deep(.sticky-col),
  .planning-table :deep(.sticky-right) {
    left: auto !important;
    right: auto !important;
    box-shadow: none !important;
  }
  .planning-table :deep(td.sticky-col:not(.col-desc)),
  .planning-table :deep(td.sticky-right) {
    position: relative !important;
  }
  /* DESC tetap menempel di kiri supaya tiap baris angka masih ada labelnya. */
  .planning-table :deep(.col-desc) {
    left: 0 !important;
    width: 92px !important; min-width: 92px !important; max-width: 92px !important;
    font-size: 9.5px;
    white-space: normal;
    box-shadow: 2px 0 4px rgba(0, 0, 0, .12) !important;
  }
}
.table-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
}

.planning-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.table-wrapper::-webkit-scrollbar {
  height: 12px;
  width: 12px;
}
.table-wrapper::-webkit-scrollbar-track {
  background: var(--dm-bg, #f1f1f1);
  border-radius: 6px;
}
.table-wrapper::-webkit-scrollbar-thumb {
  background: #4472c4;
  border-radius: 6px;
}
.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #2e5396;
}
</style>
