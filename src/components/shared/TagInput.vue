<script setup lang="ts">
import { computed, ref } from 'vue';

/**
 * Input daftar teks berbentuk chip. Nilai baru ditambahkan dengan Enter,
 * koma, atau saat input kehilangan fokus. Nilai kembar dibuang otomatis.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string[];
    placeholder?: string;
    suggestions?: string[];
    maxLength?: number;
    disabled?: boolean;
    inputId?: string;
    uppercase?: boolean;
  }>(),
  {
    placeholder: 'Ketik lalu tekan Enter',
    suggestions: () => [],
    maxLength: 50,
    disabled: false,
    inputId: undefined,
    uppercase: false
  }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>();

const draft = ref('');

const availableSuggestions = computed(() => props.suggestions.filter((s) => !props.modelValue.includes(s)));

function commit(raw: string) {
  const parts = raw
    .split(',')
    .map((v) => (props.uppercase ? v.trim().toUpperCase() : v.trim()))
    .filter((v) => v.length > 0 && v.length <= props.maxLength);

  if (parts.length === 0) return;

  const next = [...props.modelValue];
  parts.forEach((p) => {
    if (!next.includes(p)) next.push(p);
  });

  emit('update:modelValue', next);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    commit(draft.value);
    draft.value = '';
    return;
  }

  if (e.key === 'Backspace' && draft.value === '' && props.modelValue.length > 0) {
    emit('update:modelValue', props.modelValue.slice(0, -1));
  }
}

function onBlur() {
  commit(draft.value);
  draft.value = '';
}

function remove(value: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((v) => v !== value)
  );
}

function addSuggestion(value: string) {
  commit(value);
}
</script>

<template>
  <div>
    <div
      class="flex flex-wrap items-center gap-1.5 bg-gray-50 !border !border-gray-300 rounded-lg p-2 focus-within:ring-1 focus-within:ring-blue-500 focus-within:!border-blue-500 dark:bg-gray-700 dark:!border-gray-600"
      :class="disabled ? 'opacity-60 pointer-events-none' : ''"
    >
      <span
        v-for="tag in modelValue"
        :key="tag"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium dark:bg-blue-900/50 dark:text-blue-200"
      >
        {{ tag }}
        <button type="button" class="hover:text-blue-900 dark:hover:text-white" :title="`Hapus ${tag}`" @click="remove(tag)">
          <i class="mdi mdi-close text-[13px]" />
        </button>
      </span>

      <input
        :id="inputId"
        v-model="draft"
        type="text"
        :placeholder="modelValue.length === 0 ? placeholder : ''"
        :disabled="disabled"
        class="flex-1 min-w-[8rem] bg-transparent !border-0 p-0.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 dark:text-white"
        autocomplete="off"
        @keydown="onKeydown"
        @blur="onBlur"
      />
    </div>

    <div v-if="availableSuggestions.length > 0 && !disabled" class="flex flex-wrap items-center gap-1 mt-1.5">
      <span class="text-[11px] text-gray-400">Saran:</span>
      <button
        v-for="s in availableSuggestions"
        :key="s"
        type="button"
        class="px-2 py-0.5 rounded-full !border !border-gray-300 text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition dark:!border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
        @click="addSuggestion(s)"
      >
        + {{ s }}
      </button>
    </div>
  </div>
</template>
