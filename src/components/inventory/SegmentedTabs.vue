<script setup lang="ts">
export interface SegmentedTabOption {
  value: string;
  label: string;
  count?: number;
  // Warna aksen tab aktif
  tone?: 'indigo' | 'blue' | 'green' | 'gray';
}

defineProps<{
  modelValue: string;
  options: SegmentedTabOption[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const toneClass: Record<string, { text: string; badge: string }> = {
  indigo: { text: 'text-indigo-700 dark:text-indigo-300', badge: 'bg-indigo-600 text-white' },
  blue: { text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-600 text-white' },
  green: { text: 'text-green-700 dark:text-green-300', badge: 'bg-green-600 text-white' },
  gray: { text: 'text-gray-800 dark:text-gray-100', badge: 'bg-gray-700 text-white' }
};
</script>

<template>
  <div class="inline-flex flex-wrap items-center gap-1 rounded-[14px] bg-slate-100 p-1 dark:bg-gray-700" role="tablist">
    <button
      v-for="item in options"
      :key="item.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.value"
      @click="emit('update:modelValue', item.value)"
      class="flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-all focus:outline-none"
      :class="
        modelValue === item.value
          ? `bg-white shadow-sm dark:bg-gray-800 ${toneClass[item.tone || 'indigo'].text}`
          : 'text-gray-500 hover:bg-white/60 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
      "
    >
      {{ item.label }}
      <span
        v-if="item.count !== undefined"
        class="min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold"
        :class="modelValue === item.value ? toneClass[item.tone || 'indigo'].badge : 'bg-slate-200 text-gray-600 dark:bg-gray-600 dark:text-gray-200'"
      >
        {{ item.count }}
      </span>
    </button>
  </div>
</template>
