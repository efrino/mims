<script setup lang="ts">
import { computed } from 'vue';
import type {
  MdfoKey,
  NtcMdfoKey
} from '@/types/Marketing/UploadMdfo';

type FilterKey = MdfoKey | NtcMdfoKey | string;
type SortDirection = 'none' | 'asc' | 'desc';

const props = withDefaults(
  defineProps<{
    col: {
      key: FilterKey;
      label: string;
    };
    store: any;
    mode?: 'standard' | 'ntc' | 'gaya';
  }>(),
  {
    mode: 'standard'
  }
);

const cleanLabel = (label: string) => {
  return label.replace(/\n/g, ' ');
};

const isNtcMode = computed(() => props.mode === 'ntc');
const isGayaMode = computed(() => props.mode === 'gaya');
const key = computed(() => props.col.key as any);

const isOpen = computed(() => {
  if (isNtcMode.value) {
    return Boolean(
      props.store.ntcOpenFilters?.[key.value]
    );
  }

  if (isGayaMode.value) {
    return props.store.gayaActiveFilterKey === key.value;
  }

  return Boolean(
    props.store.openFilters?.[key.value]
  );
});

const popupPosition = computed(() => {
  if (isNtcMode.value) {
    return props.store.ntcFilterPopupPosition;
  }

  if (isGayaMode.value) {
    return props.store.gayaFilterPopupPosition;
  }

  return props.store.filterPopupPosition;
});

const searchValue = computed<string>({
  get() {
    if (isNtcMode.value) {
      return String(
        props.store.ntcSearchFilters?.[key.value] ?? ''
      );
    }

    if (isGayaMode.value) {
      return String(
        props.store.gayaSearchFilters?.[key.value] ?? ''
      );
    }

    return String(
      props.store.searchFilters?.[key.value] ?? ''
    );
  },
  set(value) {
    if (isNtcMode.value) {
      props.store.ntcSearchFilters[key.value] = value;
      return;
    }

    if (isGayaMode.value) {
      props.store.gayaSearchFilters[key.value] = value;
      return;
    }

    props.store.searchFilters[key.value] = value;
  }
});

const selectedValues = computed<string[]>(() => {
  if (isNtcMode.value) {
    return (
      props.store.ntcSelectedFilters?.[key.value] || []
    );
  }

  if (isGayaMode.value) {
    return (
      props.store.gayaSelectedFilters?.[key.value] || []
    );
  }

  return (
    props.store.selectedFilters?.[key.value] || []
  );
});

const selectVisibleLabel = computed(() => {
  return props.store.rawServerPaged === true
    ? 'Select Shown'
    : 'Select All';
});

const filteredOptions = computed<string[]>(() => {
  if (isNtcMode.value) {
    return props.store.getNtcColumnOptions(
      key.value
    );
  }

  if (isGayaMode.value) {
    return props.store.getGayaColumnOptions(
      key.value
    );
  }

  return props.store.getFilteredColumnOptions(
    key.value
  );
});

const closePopup = (): void => {
  if (isNtcMode.value) {
    props.store.closeNtcFilters();
    return;
  }

  if (isGayaMode.value) {
    props.store.closeGayaFilters();
    return;
  }

  props.store.closeAllDropdowns();
};

const setSort = (
  direction: SortDirection
): void => {
  if (isNtcMode.value) {
    props.store.setNtcSort(
      key.value,
      direction
    );
    return;
  }

  if (isGayaMode.value) {
    props.store.setGayaSort(
      key.value,
      direction
    );
    return;
  }

  props.store.setSort(
    key.value,
    direction
  );
};

const isNoSortActive = (): boolean => {
  if (isNtcMode.value) {
    return props.store.isNtcNoSortActive(key.value);
  }

  if (isGayaMode.value) {
    return props.store.isGayaNoSortActive(key.value);
  }

  return props.store.isNoSortActive(key.value);
};

const isSortActive = (
  direction: 'asc' | 'desc'
): boolean => {
  if (isNtcMode.value) {
    return props.store.isNtcSortActive(
      key.value,
      direction
    );
  }

  if (isGayaMode.value) {
    return props.store.isGayaSortActive(
      key.value,
      direction
    );
  }

  return props.store.isSortActive(
    key.value,
    direction
  );
};

const isAllSelected = (): boolean => {
  return filteredOptions.value.length > 0 &&
    filteredOptions.value.every((option) =>
      selectedValues.value.includes(option)
    );
};

const toggleAllColumn = (): void => {
  if (isNtcMode.value) {
    props.store.toggleNtcAllColumn(
      key.value
    );
    return;
  }

  if (isGayaMode.value) {
    props.store.toggleGayaAllColumn(
      key.value
    );
    return;
  }

  props.store.toggleAllColumn(
    key.value
  );
};

const clearColumnFilter = (): void => {
  if (isNtcMode.value) {
    props.store.clearNtcColumnFilter(
      key.value
    );
    return;
  }

  if (isGayaMode.value) {
    props.store.clearGayaColumnFilter(
      key.value
    );
    return;
  }

  props.store.clearColumnFilter(
    key.value
  );
};

const toggleFilter = (
  option: string
): void => {
  if (isNtcMode.value) {
    props.store.toggleNtcFilterOption(
      key.value,
      option
    );
    return;
  }

  if (isGayaMode.value) {
    props.store.toggleGayaFilterOption(
      key.value,
      option
    );
    return;
  }

  props.store.toggleFilter(
    key.value,
    option
  );
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed w-[270px] bg-white !border !border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.25)] z-[99999] overflow-hidden text-left"
      :style="{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`
      }"
      @click.stop
    >
      <!-- CLOSE POPUP -->
      <button
        type="button"
        aria-label="Close filter"
        title="Close"
        class="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 shadow-sm transition-all duration-200 hover:!border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
        @click.stop="closePopup"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <!-- SORT -->
      <div class="px-4 py-2 pt-6 pr-4 bg-slate-50 !border-b !border-slate-200">
        <div class="text-xs font-bold text-slate-500 uppercase mb-1">Sort</div>

        <div class="grid grid-cols-3 gap-2">
          <!-- NONE -->
          <button
            type="button"
            @click="setSort('none')"
            :aria-pressed="isNoSortActive()"
            :class="[
              'rounded-xl border py-1 px-2 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1',
              isNoSortActive()
                ? 'border-green-400 bg-green-100 text-green-800 shadow-sm ring-2 ring-green-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50 hover:text-green-700'
            ]"
          >
            <span
              :class="[
                'px-1 rounded transition-colors',
                isNoSortActive() ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-600'
              ]"
            >
              ↕
            </span>
            None
          </button>

          <!-- A-Z -->
          <button
            type="button"
            @click="setSort('asc')"
            :aria-pressed="isSortActive('asc')"
            :class="[
              'rounded-xl border py-1 px-2 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1',
              isSortActive('asc')
                ? 'border-green-400 bg-green-100 text-green-800 shadow-sm ring-2 ring-green-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50 hover:text-green-700'
            ]"
          >
            <span
              :class="[
                'px-1 rounded transition-colors',
                isSortActive('asc') ? 'bg-green-200 text-green-700' : 'bg-green-100 text-green-600'
              ]"
            >
              A
            </span>
            A → Z
          </button>

          <!-- Z-A -->
          <button
            type="button"
            @click="setSort('desc')"
            :aria-pressed="isSortActive('desc')"
            :class="[
              'rounded-xl border py-1 px-2 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1',
              isSortActive('desc')
                ? 'border-green-400 bg-green-100 text-green-800 shadow-sm ring-2 ring-green-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50 hover:text-green-700'
            ]"
          >
            <span
              :class="[
                'px-1 rounded transition-colors',
                isSortActive('desc') ? 'bg-orange-200 text-orange-700' : 'bg-orange-100 text-orange-600'
              ]"
            >
              Z
            </span>
            Z → A
          </button>
        </div>
      </div>

      <!-- SEARCH -->
      <div class="px-3 py-3 !border-b !border-slate-200">
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>

          <input
            v-model="searchValue"
            type="text"
            :placeholder="`Search ${cleanLabel(col.label)}...`"
            class="w-full rounded-xl !border !border-slate-200 py-1 pl-10 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <!-- HEADER -->
      <div class="flex justify-between items-center px-4 py-2 !border-b !border-slate-200">
        <label class="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            :checked="isAllSelected()"
            @change="toggleAllColumn"
            class="w-4 h-4 rounded text-blue-600 !border !border-slate-400"
          />
          {{ selectVisibleLabel }}
        </label>

        <button
          type="button"
          @click="clearColumnFilter"
          class="text-xs text-red-500 font-semibold"
        >
          Clear Filter
        </button>
      </div>

      <!-- LIST -->
      <div class="max-h-50 overflow-y-auto">
        <label
          v-for="option in filteredOptions"
          :key="option"
          class="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs"
        >
          <input
            type="checkbox"
            :checked="selectedValues.includes(option)"
            @change="toggleFilter(option)"
            class="w-4 h-4 rounded text-blue-600 !border !border-slate-400 ml-1"
          />

          {{ option }}
        </label>
      </div>
    </div>
  </Teleport>
</template>
