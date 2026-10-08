<script setup lang="ts">
import { computed } from 'vue';
import { useCustomerOrderStore } from '@/stores/Marketing/UploadSo';
import {
  DATE_FILTER_SEARCH_HELPER,
  isDateFilterColumn
} from '@/utils/dateFilterHelper';
import type { FormatSOKey } from '@/types/Marketing/UploadSo';
type CustomerOrderStore = ReturnType<typeof useCustomerOrderStore>;
const props = defineProps<{
  col: {
    key: FormatSOKey;
    label: string;
  };
  store: CustomerOrderStore;
}>();
const cleanLabel = (label: string): string => {
  return label.replace(/\n/g, ' ');
};
const isDateColumn = computed(() =>
  isDateFilterColumn(String(props.col.key), props.col.label)
);
const onSearchInput = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  props.store.setFormatSOSearchValue(props.col.key, input.value);
  props.store.queueFormatSOFilterOptionSearch(props.col.key, input.value);
};
const filteredOptions = computed(() =>
  props.store.getFormatSOFilteredOptions(props.col.key)
);
const isAllSelected = computed(() =>
  filteredOptions.value.length > 0 &&
  filteredOptions.value.every((option) =>
    props.store.isFormatSOFilterSelected(props.col.key, option)
  )
);
const isRemoteLoading = computed(() =>
  props.store.isFormatSOFilterOptionLoading(props.col.key)
);
const isRemoteSearch = computed(() =>
  props.store.isFormatSOFilterRemoteSearch(props.col.key)
);
const selectAllLabel = computed(() =>
  props.store.isFormatSOFilterServerPaged()
    ? 'Select Shown'
    : 'Select All'
);
const searchLength = computed(() =>
  props.store.getFormatSOSearchValue(props.col.key).trim().length
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="store.formatSOOpenFilters[col.key]"
      class="fixed z-[99999] flex w-[270px] flex-col overflow-hidden rounded-2xl !border !border-slate-200 bg-white pb-1 text-left shadow-[0_20px_50px_rgba(15,23,42,0.25)]"
      :style="{
        top: `${store.formatSOFilterPopupPosition.top}px`,
        left: `${store.formatSOFilterPopupPosition.left}px`,
        maxHeight: `${store.formatSOFilterPopupPosition.maxHeight}px`
      }"
      @click.stop
    >
      <!-- Close popup -->
      <button
        type="button"
        aria-label="Tutup filter"
        title="Tutup"
        class="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
        @click.stop="store.closeFormatSOFilter()"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <!-- Sorting -->
      <div class="flex-none !border-b !border-slate-200 bg-slate-50 px-4 pb-2 pt-6">
        <div class="mb-1 text-xs font-bold uppercase text-slate-500">Sort</div>

        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            :aria-pressed="store.getFormatSOSortDirection(col.key) === 'none'"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl border px-2 py-1 text-xs font-semibold transition-all',
              store.getFormatSOSortDirection(col.key) === 'none'
                ? 'border-green-400 bg-green-100 text-green-800 ring-2 ring-green-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50'
            ]"
            @click="store.setFormatSOSort(col.key, 'none')"
          >
            <span class="rounded bg-white px-1">↕</span>
            None
          </button>

          <button
            type="button"
            :aria-pressed="store.getFormatSOSortDirection(col.key) === 'asc'"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl border px-2 py-1 text-xs font-semibold transition-all',
              store.getFormatSOSortDirection(col.key) === 'asc'
                ? 'border-green-400 bg-green-100 text-green-800 ring-2 ring-green-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50'
            ]"
            @click="store.setFormatSOSort(col.key, 'asc')"
          >
            <span class="rounded bg-green-100 px-1 text-green-600">A</span>
            A → Z
          </button>

          <button
            type="button"
            :aria-pressed="store.getFormatSOSortDirection(col.key) === 'desc'"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl border px-2 py-1 text-xs font-semibold transition-all',
              store.getFormatSOSortDirection(col.key) === 'desc'
                ? 'border-green-400 bg-green-100 text-green-800 ring-2 ring-green-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50'
            ]"
            @click="store.setFormatSOSort(col.key, 'desc')"
          >
            <span class="rounded bg-orange-100 px-1 text-orange-600">Z</span>
            Z → A
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="flex-none px-3 py-3 !border-b !border-slate-200">
        <div class="relative">
          <svg
            class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>

          <input
            :value="store.getFormatSOSearchValue(col.key)"
            type="text"
            :placeholder="`Search ${cleanLabel(col.label)}...`"
            class="w-full rounded-xl !border !border-slate-200 py-1 pl-10 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            @input="onSearchInput"
          />
        </div>
        <p
          v-if="isDateColumn"
          class="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] leading-4 text-blue-700"
        >
          <span aria-hidden="true" class="font-bold">i</span>
          <span>{{ DATE_FILTER_SEARCH_HELPER }}</span>
        </p>
        <p class="mt-1.5 px-1 text-[10px] leading-4 text-slate-400">
          3+ karakter = cari semua data
        </p>
      </div>

      <!-- Select all and clear -->
      <div class="flex flex-none items-center justify-between !border-b !border-slate-200 px-4 py-2">
        <label class="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            :checked="isAllSelected"
            class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
            @change="store.toggleAllFormatSOColumn(col.key)"
          />
          <span>{{ selectAllLabel }}</span>
        </label>

        <button
          type="button"
          class="text-xs font-semibold text-red-500 hover:underline"
          @click.stop="store.clearFormatSOColumnFilter(col.key)"
        >
          Clear Filter
        </button>
      </div>

      <!-- Options -->
      <div class="min-h-0 flex-1 overflow-y-auto">
        <label
          v-for="option in filteredOptions"
          :key="option"
          class="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs hover:bg-blue-50"
        >
          <input
            type="checkbox"
            :checked="store.isFormatSOFilterSelected(col.key, option)"
            class="ml-1 h-4 w-4 cursor-pointer rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
            @change="store.toggleFormatSOFilterValue(col.key, option)"
          />

          <span class="min-w-0 flex-1 whitespace-pre-line leading-tight" :title="option">
            {{ option }}
          </span>
        </label>

        <div v-if="filteredOptions.length === 0" class="px-4 py-4 text-center text-xs text-slate-400">
          <span v-if="isRemoteLoading">Mencari...</span>
          <span v-else-if="searchLength > 0 && searchLength < 3">Ketik minimal 3 karakter</span>
          <span v-else-if="isRemoteSearch">Tidak ditemukan</span>
          <span v-else>Tidak ada data</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
