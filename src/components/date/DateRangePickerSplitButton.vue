<template>
  <div ref="wrapperEl" class="relative inline-flex">
    <button
      type="button"
      @click.stop="toggleOpen('start')"
      class="flex flex-col items-center justify-center gap-0.5 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium text-sm px-4 py-2 rounded-s-full border-r border-blue-500"
    >
      <span class="text-[10px] uppercase tracking-wide opacity-80 leading-none">{{ startLabel }}</span>
      <span class="leading-none text-nowrap">{{ formatDateLabel(start) || '-' }}</span>
    </button>
    <button
      type="button"
      @click.stop="toggleOpen('end')"
      class="flex flex-col items-center justify-center gap-0.5 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium text-sm px-4 py-2 rounded-e-full"
    >
      <span class="text-[10px] uppercase tracking-wide opacity-80 leading-none">{{ endLabel }}</span>
      <span class="leading-none text-nowrap">{{ formatDateLabel(end) || '-' }}</span>
    </button>
    <div
      v-show="isOpen"
      class="absolute top-full left-0 z-50 mt-2 bg-white border rounded-lg shadow"
      @click.stop
    >
      <div class="flex items-center justify-center gap-4 px-3 pt-3 text-xs">
        <span class="flex items-center gap-1" :class="activeSide === 'start' ? 'text-blue-600 font-semibold' : 'text-gray-600'">
          <span class="w-2.5 h-2.5 rounded-full inline-block" :class="activeSide === 'start' ? 'bg-blue-600' : 'bg-gray-300'"></span> {{ startLabel }}: {{ formatDateLabel(start) || '-' }}
        </span>
        <span class="flex items-center gap-1" :class="activeSide === 'end' ? 'text-blue-600 font-semibold' : 'text-gray-600'">
          <span class="w-2.5 h-2.5 rounded-full inline-block" :class="activeSide === 'end' ? 'bg-blue-600' : 'bg-gray-300'"></span> {{ endLabel }}: {{ formatDateLabel(end) || '-' }}
        </span>
      </div>
      <div class="text-center text-[11px] text-gray-400 pb-1">
        Memilih tanggal {{ activeSide === 'start' ? startLabel : endLabel }}
      </div>
      <div class="p-3">
        <div :id="calendarId"></div>
      </div>
      <div class="flex items-center justify-between px-3 pb-3 pt-1 border-t border-gray-100">
        <button
          type="button"
          @click="clearRange"
          class="text-xs font-medium text-gray-500 hover:text-red-600"
        >
          Clear
        </button>
        <button
          type="button"
          @click="isOpen = false"
          class="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full px-4 py-1.5"
        >
          OK
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, useId } from 'vue';
// @ts-ignore
import Datepicker from 'flowbite-datepicker/Datepicker';

interface Props {
  start: string;
  end: string;
  startLabel?: string;
  endLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  startLabel: 'Start',
  endLabel: 'End',
});

const emit = defineEmits<{
  'update:start': [value: string];
  'update:end': [value: string];
}>();

const uid = useId();
const calendarId = `datepicker-inline-range-split-${uid}`;
const wrapperEl = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const activeSide = ref<'start' | 'end'>('start');

function toggleOpen(side: 'start' | 'end') {
  if (isOpen.value && activeSide.value === side) {
    isOpen.value = false;
    return;
  }
  activeSide.value = side;
  isOpen.value = true;
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return;
  if (wrapperEl.value && !wrapperEl.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

function clearRange() {
  emit('update:start', '');
  emit('update:end', '');
  activeSide.value = 'start';
}

function formatDateLabel(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function applyRangeHighlight() {
  const container = document.getElementById(calendarId);
  if (!container) return;

  const startTs = props.start ? new Date(props.start).setHours(0, 0, 0, 0) : null;
  const endTs = props.end ? new Date(props.end).setHours(0, 0, 0, 0) : null;

  const cells = Array.from(container.querySelectorAll<HTMLElement>('.datepicker-cell'));

  cells.forEach((cell, i) => {
    cell.classList.remove('range-highlight', 'range-start', 'range-end');
    cell.style.borderRadius = '';
    cell.style.margin = '';

    const raw = cell.dataset.date;
    if (!raw) return;
    const t = Number(raw);

    if (startTs !== null && endTs === null) {
      if (t === startTs) {
        cell.classList.add('range-highlight', 'range-start');
        cell.style.borderRadius = '9999px';
      }
      return;
    }

    if (startTs === null || endTs === null || t < startTs || t > endTs) return;

    cell.classList.add('range-highlight');
    if (t === startTs) cell.classList.add('range-start');
    if (t === endTs) cell.classList.add('range-end');

    const isRowStart = i % 7 === 0;
    const isRowEnd = i % 7 === 6;
    const prevRaw = !isRowStart ? cells[i - 1]?.dataset.date : undefined;
    const nextRaw = !isRowEnd ? cells[i + 1]?.dataset.date : undefined;
    const prevInRange = prevRaw !== undefined && Number(prevRaw) >= startTs && Number(prevRaw) <= endTs;
    const nextInRange = nextRaw !== undefined && Number(nextRaw) >= startTs && Number(nextRaw) <= endTs;

    const roundLeft = isRowStart || !prevInRange;
    const roundRight = isRowEnd || !nextInRange;

    if (roundLeft && roundRight) cell.style.borderRadius = '9999px';
    else if (roundLeft) cell.style.borderRadius = '9999px 0 0 9999px';
    else if (roundRight) cell.style.borderRadius = '0 9999px 9999px 0';
    else cell.style.borderRadius = '0';

    cell.style.margin = '0';
  });
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);

  const rangeEl = document.getElementById(calendarId);
  if (!rangeEl) return;

  new Datepicker(rangeEl, {
    autohide: false,
    format: 'yyyy-mm-dd',
  });

  const toLocalDate = (d: Date) =>
    [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

  const handleCellClick = (e: MouseEvent) => {
    const cell = (e.target as HTMLElement).closest('.datepicker-cell') as HTMLElement | null;
    if (!cell || cell.classList.contains('disabled')) return;
    const raw = cell.dataset.date;
    if (!raw) return;
    const clicked = toLocalDate(new Date(Number(raw)));

    if (activeSide.value === 'start') {
      emit('update:start', clicked);
      if (props.end && clicked > props.end) {
        emit('update:end', '');
      }
      activeSide.value = 'end';
    } else {
      if (props.start && clicked < props.start) {
        emit('update:start', clicked);
      } else {
        emit('update:end', clicked);
      }
    }
  };

  rangeEl.addEventListener('click', handleCellClick, { capture: true });

  const deferredHighlight = () => setTimeout(applyRangeHighlight, 0);
  rangeEl.addEventListener('changeMonth', deferredHighlight);
  rangeEl.addEventListener('changeYear', deferredHighlight);
  rangeEl.addEventListener('changeView', deferredHighlight);

  applyRangeHighlight();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

watch(
  () => [props.start, props.end],
  () => applyRangeHighlight()
);
</script>

<style>
.datepicker-cell.selected,
.datepicker-cell.selected:hover {
  background-color: #3b82f6 !important;
  color: white !important;
  font-weight: 600;
}
.datepicker-cell.today {
  background-color: #dbeafe;
  font-weight: 600;
}
.datepicker-cell.today.selected {
  background-color: #3b82f6 !important;
  color: white !important;
}
.datepicker-cell:hover {
  background-color: #f3f4f6;
}
.datepicker-cell.focused:not(.selected) {
  background-color: #e5e7eb;
}
.datepicker-cell {
  border-radius: 0.375rem;
  margin: .5px;
}
.datepicker-cell.prev,
.datepicker-cell.next {
  color: #b8b8b8 !important;
}

.datepicker-cell.range-highlight {
  background-color: #2196f3 !important;
  color: #fff !important;
}
.datepicker-cell.range-start,
.datepicker-cell.range-end {
  position: relative;
}
.datepicker-cell.range-start::after,
.datepicker-cell.range-end::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 9999px;
  border: 2px solid #fff;
  pointer-events: none;
}
</style>
