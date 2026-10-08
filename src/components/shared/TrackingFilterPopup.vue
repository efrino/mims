<script setup lang="ts">
import { computed } from 'vue';
import { useCustomerOrderStore } from '@/stores/Marketing/UploadSo';
import {
  DATE_FILTER_SEARCH_HELPER,
  isDateFilterColumn
} from '@/utils/dateFilterHelper';

import type { ColumnKey } from '@/types/Marketing/UploadSo';

// Resolve the Pinia store locally to avoid passing the reactive store through every popup.

const props = defineProps<{

  col: {

    key: ColumnKey;

    label: string;

  };

}>();

const store = useCustomerOrderStore();

// Helpers

const cleanLabel = (label: string): string => {

  return label.replace(/\n/g, ' ');

};

const isDateColumn = computed(() =>
  isDateFilterColumn(String(props.col.key), props.col.label)
);

const onSearchInput = (event: Event): void => {

  const input = event.target as HTMLInputElement;

  store.setSearchValue(

    props.col.key,

    input.value

  );

};
const filteredOptions = computed(() =>
  store.getFilteredColumnOptions(props.col.key)
);
const isLoadingOptions = computed(() =>
  store.isTrackingFilterOptionsLoading(props.col.key)
);
const hasMoreOptions = computed(() =>
  store.trackingFilterOptionsHasMore(props.col.key)
);
const optionsError = computed(() =>
  store.getTrackingFilterOptionsError(props.col.key)
);
const isAllSelected = computed(() =>
  filteredOptions.value.length > 0 &&
  filteredOptions.value.every((option) =>
    store.isFilterSelected(props.col.key, option)
  )
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="store.openFilters[col.key]"
      class="fixed z-[99999] flex w-[300px] flex-col overflow-hidden rounded-2xl !border !border-slate-200 bg-white pb-2 text-left shadow-[0_20px_50px_rgba(15,23,42,0.25)]"
      :style="{
        top: `${store.trackingFilterPopupPosition.top}px`,
        left: `${store.trackingFilterPopupPosition.left}px`,
        maxHeight: `${store.trackingFilterPopupPosition.maxHeight}px`
      }"
      @click.stop
    >
      
      <!-- Close -->
      
      <button
        type="button"
        aria-label="Tutup filter"
        title="Tutup"
        class="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:!border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
        @click.stop="store.closeTrackingFilter()"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          class="h-4 w-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      </button>
      
      <!-- Sort -->
      
      <div class="flex-none !border-b !border-slate-200 bg-slate-50 px-4 pb-2 pt-6">
        <div class="mb-1 text-xs font-bold uppercase text-slate-500">
          Sort
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition-all',
              store.getTrackingSortDirection(col.key) === 'none'
                ? '!border-green-400 bg-green-100 text-green-800'
                : '!border-slate-200 bg-white text-slate-700 hover:!border-green-300 hover:bg-green-50'
            ]"
            @click="store.setTrackingSort(col.key, 'none')"
          >
            <span class="rounded bg-white px-1">
              ↕
            </span>
            None
          </button>
          <button
            type="button"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition-all',
              store.getTrackingSortDirection(col.key) === 'asc'
                ? '!border-green-400 bg-green-100 text-green-800'
                : '!border-slate-200 bg-white text-slate-700 hover:!border-green-300 hover:bg-green-50'
            ]"
            @click="store.setTrackingSort(col.key, 'asc')"
          >
            <span class="rounded bg-emerald-100 px-1 text-emerald-600">
              A
            </span>
            A → Z
          </button>
          <button
            type="button"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition-all',
              store.getTrackingSortDirection(col.key) === 'desc'
                ? '!border-green-400 bg-green-100 text-green-800'
                : '!border-slate-200 bg-white text-slate-700 hover:!border-green-300 hover:bg-green-50'
            ]"
            @click="store.setTrackingSort(col.key, 'desc')"
          >
            <span class="rounded bg-orange-100 px-1 text-orange-600">
              Z
            </span>
            Z → A
          </button>
        </div>
      </div>
      
      <!-- Search -->
      
      <div class="flex-none !border-b !border-slate-200 px-3 py-2">
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
          <input
            :value="store.getSearchValue(col.key)"
            type="text"
            :placeholder="`Search ${cleanLabel(col.label)}...`"
            class="w-full rounded-xl !border !border-slate-200 py-1.5 pl-10 pr-3 text-xs text-slate-700 outline-none focus:!border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            @input="onSearchInput"
          />
        </div>
        <p
          v-if="isDateColumn"
          class="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] leading-4 text-emerald-700"
        >
          <span aria-hidden="true" class="font-bold">i</span>
          <span>{{ DATE_FILTER_SEARCH_HELPER }}</span>
        </p>
        <p class="mt-1.5 px-1 text-[10px] leading-4 text-slate-400">
          3+ karakter = cari semua data
        </p>
        <p
          v-if="optionsError"
          class="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] leading-4 text-red-600"
        >
          {{ optionsError }}
        </p>
      </div>
      
      <!-- Color Filter -->
      
      <div
        v-if="store.getColumnColorOptions(col.key).length > 0"
        class="flex-none !border-b !border-slate-200 bg-slate-50/70 px-4 py-2"
      >
        <div class="mb-1 text-xs font-bold text-slate-500">
          Filter by color
        </div>
        <div class="grid grid-cols-3 gap-1">
          <button
            v-for="color in store.getColumnColorOptions(col.key)"
            :key="color.key"
            type="button"
            :class="[
              'flex min-w-0 items-center gap-1 rounded-full !border bg-white px-2 py-1 text-xs transition-all hover:bg-emerald-50',
              store.isColorSelected(col.key, color.key)
                ? '!border-emerald-500 text-emerald-700 ring-2 ring-emerald-100'
                : '!border-slate-200 text-slate-600'
            ]"
            @click.stop="store.toggleColorFilter(col.key, color.key)"
          >
            <span
              :class="[
                store.colorDotClass(color.key),
                'h-3 w-3 shrink-0 rounded-full !border !border-slate-300'
              ]"
            />
            <span class="truncate">
              {{ color.label }}
            </span>
          </button>
        </div>
      </div>
      
      <!-- Select All / Clear -->
      
      <div class="flex flex-none items-center justify-between !border-b !border-slate-200 px-4 py-2">
        <label class="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            :checked="isAllSelected"
            class="h-4 w-4 rounded !border !border-slate-400 text-emerald-600 focus:ring-emerald-500"
            @change="store.toggleAllColumn(col.key)"
          />
          <span>
            {{ hasMoreOptions ? 'Select shown' : 'Select All' }}
          </span>
        </label>
        <button
          type="button"
          class="text-xs font-semibold text-red-500 transition hover:text-red-600 hover:underline"
          @click.stop="store.clearColumnFilter(col.key)"
        >
          Clear Filter
        </button>
      </div>
      
      <!-- Options -->
      
      <!-- flex-1: list mengambil sisa tinggi popup. -->
      <div
        class="min-h-[90px] flex-1 overflow-y-auto overscroll-contain pb-0.1 scrollbar-thin"
        @wheel.stop
      >
        <label
          v-for="option in filteredOptions"
          :key="option"
          class="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs text-slate-700 transition hover:bg-emerald-50"
        >
          <input
            type="checkbox"
            :checked="store.isFilterSelected(col.key, option)"
            class="ml-1 h-4 w-4 shrink-0 rounded !border !border-slate-400 text-emerald-600 focus:ring-emerald-500"
            @change="store.toggleFilter(col.key, option)"
          />
          <span
            class="min-w-0 flex-1 whitespace-pre-line leading-tight"
            :title="option"
          >
            {{ option }}
          </span>
        </label>
        <div
          v-if="filteredOptions.length === 0 && !isLoadingOptions"
          class="px-4 py-4 text-center text-xs text-slate-400"
        >
          Tidak ada data
        </div>
      </div>
    </div>
  </Teleport>
</template>
