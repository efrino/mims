<template>
  <div class="space-y-1 relative">
    <label v-if="label" class="text-xs font-bold text-gray-500 uppercase tracking-wider block">
      {{ label }}
    </label>

    <div class="relative">
      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="emit('search', searchQuery)"
        class="w-full py-1 px-2.5 pr-6 outline-1 outline-gray-300 text-gray-700 text-sm bg-white border rounded-lg dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-300 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40"
        :class="props.inputClass"
        :placeholder="computedPlaceholder"
      />

      <button
        v-if="modelValue !== null && modelValue !== ''"
        @click="clearSelection"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
      >
        ✕
      </button>

      <Teleport to="body">
        <ul
          v-if="isOpen && filteredOptions.length"
          :style="dropStyle"
          class="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto"
        >
          <li
            v-for="(option, index) in filteredOptions"
            :key="index"
            @mousedown="selectOption(option)"
            class="px-4 py-2 hover:bg-amber-50 cursor-pointer text-gray-700 transition-colors flex flex-col sm:flex-row sm:justify-between"
          >
            <div class="flex flex-col gap-0 w-2/3">
              <span class="font-medium text-sm text-start text-nowrap">{{ option.label }}</span>
              <span v-if="option.sublabel" class="text-xs text-gray-500 text-start self-start">{{ option.sublabel }}</span>
            </div>
            <span
              v-if="option.statusLabel"
              class="inline-block px-2 py-1 text-xs font-semibold rounded-full w-max-1/5 h-fit self-center"
              :class="resolveStatusColor(option.statusLabel)"
            >
              {{ option.statusLabel.label }}
            </span>
          </li>
        </ul>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

export interface AutocompleteOption {
  value: string | number;
  label: string;
  sublabel?: string;
  statusLabel?: { label: string; colorMap?: Record<string, string> };
}

interface Props {
  label?: string;
  placeholder?: string;
  options: AutocompleteOption[];
  inputClass?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ search: [query: string] }>();

const modelValue = defineModel<string | number | null>({ default: null });

const inputRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref<string>('');
const isOpen = ref<boolean>(false);
const dropStyle = ref({ top: '0px', left: '0px', width: '200px' });

// Use string comparison so number IDs from the model match string IDs from the API (or vice versa)
const getLabelFromValue = (val: string | number | null): string => {
  if (val === null || val === '') return '';
  const matched = props.options.find((o) => String(o.value) === String(val));
  return matched ? matched.label : String(val);
};

onMounted(() => {
  searchQuery.value = getLabelFromValue(modelValue.value);
});

// Re-sync when the selected value changes externally
watch(
  () => modelValue.value,
  (newVal) => {
    searchQuery.value = getLabelFromValue(newVal);
  }
);

// Re-sync when options load after mount (e.g. async fetch completes after dialog opens)
watch(
  () => props.options,
  () => {
    const label = getLabelFromValue(modelValue.value);
    if (label !== searchQuery.value) searchQuery.value = label;
  }
);

const filteredOptions = computed<AutocompleteOption[]>(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return props.options.filter(
    (option) =>
      option.label.toLowerCase().includes(query) ||
      String(option.value).toLowerCase().includes(query) ||
      (option.sublabel ?? '').toLowerCase().includes(query)
  );
});

function recalcPos() {
  if (!inputRef.value) return;
  const r = inputRef.value.getBoundingClientRect();
  dropStyle.value = {
    top: `${r.bottom + 2}px`,
    left: `${r.left}px`,
    width: `${r.width}px`
  };
}

const handleFocus = (): void => {
  recalcPos();
  isOpen.value = true;
};

const selectOption = (option: AutocompleteOption): void => {
  modelValue.value = option.value;
  searchQuery.value = option.label;
  isOpen.value = false;
};

const clearSelection = (): void => {
  modelValue.value = null;
  searchQuery.value = '';
};

const handleBlur = (): void => {
  setTimeout(() => {
    isOpen.value = false;
    searchQuery.value = getLabelFromValue(modelValue.value);
  }, 200);
};

function resolveStatusColor(statusLabel: { label: string; colorMap?: Record<string, string> }): string {
  const color = statusLabel.colorMap?.[statusLabel.label] ?? 'gray';
  return `bg-${color}-100 text-${color}-800`;
}

const computedPlaceholder = computed<string>(() => {
  if (props.placeholder) return props.placeholder;
  if (props.label) return `Search ${props.label}...`;
  return 'Search options...';
});

defineExpose({
  focus: () => inputRef.value?.focus()
});
</script>
