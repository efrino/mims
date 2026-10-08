<script setup lang="ts">
import { ref, watch } from 'vue';
import type { QueueListFilters } from '@/types/Public/Welding/stockQueue';
const props = defineProps<{ modelValue: QueueListFilters }>();
const emit = defineEmits<{ 'update:modelValue': [QueueListFilters]; search: [] }>();
const local = ref<QueueListFilters>({ ...props.modelValue });
watch(
  () => props.modelValue,
  (v) => {
    local.value = { ...v };
  },
  { deep: true }
);
const STATUS_OPTIONS = [
  { label: 'Semua Status', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Done', value: 'DONE' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Pending + Failed', value: 'PENDING,FAILED' }
];
const SHIFT_OPTIONS = [
  { label: 'Semua Shift', value: '' },
  { label: 'Shift 1 (07:15–19:59)', value: 1 },
  { label: 'Shift 2 (20:00–07:14)', value: 2 }
];
function apply() {
  emit('update:modelValue', { ...local.value, page: 1 });
  emit('search');
}
function reset() {
  local.value = { page: 1, per_page: 50 };
  emit('update:modelValue', { ...local.value });
  emit('search');
}
</script>
<template>
  <div class="bg-gray-50 border border-gray-200 rounded p-3">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Status</label>
        <select
          v-model="local.status"
          class="bg-white border border-gray-300 text-gray-700 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Shift</label>
        <select
          v-model="local.shift_code"
          class="bg-white border border-gray-300 text-gray-700 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option v-for="o in SHIFT_OPTIONS" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tanggal Produksi</label>
        <input
          v-model="local.production_date"
          type="date"
          class="bg-white border border-gray-300 text-gray-700 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Part Number</label>
        <input
          v-model="local.part_number"
          type="text"
          placeholder="Cari part..."
          @keyup.enter="apply"
          class="bg-white border border-gray-300 text-gray-700 text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400"
        />
      </div>
    </div>
    <div class="flex gap-2 mt-2 justify-end">
      <button @click="reset" class="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
        Reset
      </button>
      <button @click="apply" class="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors font-semibold">
        Terapkan
      </button>
    </div>
  </div>
</template>
