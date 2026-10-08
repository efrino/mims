<template>
  <div class="inline-flex">
    <button
      type="button"
      :data-dropdown-toggle="dropdownId"
      :class="buttonClass"
    >
      <CalendarOutlined />
      <span>
        {{ label }}: <strong>{{ formatDateLabel(modelValue) || '-' }}</strong>
      </span>
      <svg class="w-2.5 h-2.5 ms-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
      </svg>
    </button>
    <div :id="dropdownId" class="hidden z-50 mt-2 w-72 bg-white border rounded-lg shadow">
      <div :id="calendarId"></div>
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
  modelValue: string;
  label?: string;
  buttonClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Tanggal',
  buttonClass:
    'mx-2 flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const uid = useId();
const dropdownId = `datepickerDropdown-${uid}`;
const calendarId = `datepicker-inline-${uid}`;

function formatDateLabel(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

let datepicker: any = null;

onMounted(() => {
  initFlowbite();

  const el = document.getElementById(calendarId);
  if (!el) return;

  datepicker = new Datepicker(el, {
    autohide: false,
    format: 'yyyy-mm-dd',
  });

  if (props.modelValue) {
    datepicker.setDate(props.modelValue);
  }

  el.addEventListener('changeDate', (e: any) => {
    const d = e.detail.date;
    const localDate = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    emit('update:modelValue', localDate);
  });
});

watch(
  () => props.modelValue,
  (value) => {
    if (datepicker && value) {
      datepicker.setDate(value);
    }
  }
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
</style>
