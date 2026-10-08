<template>
  <div class="inline-flex">
    <button
      type="button"
      :data-dropdown-toggle="dropdownId"
      :class="buttonClass"
    >
      <CalendarOutlined />
      <span>
        {{ startLabel }}: <strong>{{ formatDateLabel(start) || '-' }}</strong>
        &nbsp;–&nbsp;
        {{ endLabel }}: <strong>{{ formatDateLabel(end) || '-' }}</strong>
      </span>
      <svg class="w-2.5 h-2.5 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
      </svg>
    </button>
    <div :id="dropdownId" class="hidden z-50 mt-2 bg-white border rounded-lg shadow">
      <div class="flex items-center justify-center gap-4 px-3 pt-3 text-xs">
        <span class="flex items-center gap-1 text-gray-600">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> {{ startLabel }}: {{ formatDateLabel(start) || '-' }}
        </span>
        <span class="flex items-center gap-1 text-gray-600">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> {{ endLabel }}: {{ formatDateLabel(end) || '-' }}
        </span>
      </div>
      <div class="p-3">
        <div :id="calendarId"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, useId } from 'vue';
import { initFlowbite } from 'flowbite';
// @ts-ignore
import Datepicker from 'flowbite-datepicker/Datepicker';
import { CalendarOutlined } from '@ant-design/icons-vue';

interface Props {
  start: string;
  end: string;
  startLabel?: string;
  endLabel?: string;
  buttonClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  startLabel: 'Start Date',
  endLabel: 'End Date',
  buttonClass:
    'mx-2 flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center',
});

const emit = defineEmits<{
  'update:start': [value: string];
  'update:end': [value: string];
}>();
const uid = useId();
const dropdownId = `datepickerDropdown-range-${uid}`;
const calendarId = `datepicker-inline-range-${uid}`;

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

    // Baru start yang dipilih (belum ada end) → tandai start saja sebagai lingkaran tunggal.
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
  initFlowbite();

  const rangeEl = document.getElementById(calendarId);
  if (!rangeEl) return;

  new Datepicker(rangeEl, {
    autohide: false,
    format: 'yyyy-mm-dd',
  });

  const toLocalDate = (d: Date) =>
    [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

  // Sengaja dengar klik mentah pada .datepicker-cell, BUKAN event 'changeDate' bawaan library.
  // flowbite-datepicker hanya menembak 'changeDate' kalau tanggal yang diklik BEDA dari tanggal
  // internal terakhirnya (lihat setDate() di node_modules/flowbite-datepicker/js/Datepicker.js) —
  // jadi kalau user klik tanggal yang SAMA dua kali berturut-turut (misal start & end di hari yang
  // sama), klik kedua tidak memicu event apa pun. Highlight visualnya sendiri sudah 100% dari
  // applyRangeHighlight() (berbasis props), jadi tidak bergantung pada state seleksi internal ini.
  rangeEl.addEventListener('click', (e: MouseEvent) => {
    const cell = (e.target as HTMLElement).closest('.datepicker-cell') as HTMLElement | null;
    if (!cell || cell.classList.contains('disabled')) return;
    const raw = cell.dataset.date;
    if (!raw) return;
    const clicked = toLocalDate(new Date(Number(raw)));

    if (!props.start || (props.start && props.end)) {
      emit('update:start', clicked);
      emit('update:end', '');
    } else if (clicked < props.start) {
      emit('update:start', clicked);
    } else {
      emit('update:end', clicked);
    }
  });

  const deferredHighlight = () => setTimeout(applyRangeHighlight, 0);
  rangeEl.addEventListener('changeMonth', deferredHighlight);
  rangeEl.addEventListener('changeYear', deferredHighlight);
  rangeEl.addEventListener('changeView', deferredHighlight);

  applyRangeHighlight();
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
