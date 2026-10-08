<script setup lang="ts">
import { computed } from 'vue';
import type { QuotationColumn } from '@/types/Marketing/Quotation';

import type { useQuotationStore } from '@/stores/Marketing/QuotationStore';

type QuotationStore = ReturnType<typeof useQuotationStore>;

const props = defineProps<{
  col: QuotationColumn;
  store: QuotationStore;
}>();

const cleanLabel = (label: string) => {
  return label.replace(/\n/g, ' ');
};
const filteredOptions = computed(() =>
  props.store.getFilteredColumnOptions(props.col.key)
);
const isAllSelected = computed(() =>
  filteredOptions.value.length > 0 &&
  filteredOptions.value.every((option) =>
    props.store.isFilterSelected(props.col.key, option)
  )
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="store.openFilters[col.key]"
      class="fixed z-[99999] w-[270px] overflow-hidden rounded-2xl !border !border-slate-200 bg-white text-left shadow-[0_20px_50px_rgba(15,23,42,0.25)]"
      :style="{
        top: `${store.filterPopupPosition.top}px`,
        left: `${store.filterPopupPosition.left}px`
      }"
      @click.stop
    >
      <!-- CLOSE POPUP -->
      <button
        type="button"
        aria-label="Tutup filter"
        title="Tutup"
        class="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 shadow-sm transition-all duration-200 hover:!border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
        @click.stop="store.closeAllDropdowns()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <!-- SORT -->
      <div class="!border-b !border-slate-200 bg-slate-50 px-4 py-2 pt-6 pr-4">
        <div class="mb-1 text-xs font-bold uppercase text-slate-500">Sort</div>

        <div class="grid grid-cols-3 gap-2">
          <!-- NONE -->
          <button
            type="button"
            :aria-pressed="store.isNoSortActive(col.key)"
            :class="[
              `
                flex items-center
                justify-center gap-1
                rounded-xl border
                px-2 py-1
                text-xs font-semibold
                transition-all
                duration-200
              `,
              store.isNoSortActive(col.key)
                ? `

                    bg-green-100
                    text-green-800
                    shadow-sm
                    ring-2
                    ring-green-100
                  `
                : `
                    bg-white
                    text-slate-700
                    hover:bg-green-50
                    hover:text-green-700
                  `
            ]"
            @click="store.setSort(col.key, 'none')"
          >
            <span
              :class="[
                `
                  rounded px-1
                  transition-colors
                `,
                store.isNoSortActive(col.key)
                  ? `
                      bg-white
                      text-slate-700
                    `
                  : `
                      bg-slate-100
                      text-slate-600
                    `
              ]"
            >
              ↕
            </span>

            None
          </button>

          <!-- A-Z -->
          <button
            type="button"
            :aria-pressed="store.isSortActive(col.key, 'asc')"
            :class="[
              `
                flex items-center
                justify-center gap-1
                rounded-xl border
                px-2 py-1
                text-xs font-semibold
                transition-all
                duration-200
              `,
              store.isSortActive(col.key, 'asc')
                ? `
                    bg-green-100
                    text-green-800
                    shadow-sm
                    ring-2
                    ring-green-100
                  `
                : `
                    bg-white
                    text-slate-700
                    hover:bg-green-50
                    hover:text-green-700
                  `
            ]"
            @click="store.setSort(col.key, 'asc')"
          >
            <span
              :class="[
                `
                  rounded px-1
                  transition-colors
                `,
                store.isSortActive(col.key, 'asc')
                  ? `
                      bg-green-200
                      text-green-700
                    `
                  : `
                      bg-green-100
                      text-green-600
                    `
              ]"
            >
              A
            </span>

            A → Z
          </button>

          <!-- Z-A -->
          <button
            type="button"
            :aria-pressed="store.isSortActive(col.key, 'desc')"
            :class="[
              `
                flex items-center
                justify-center gap-1
                rounded-xl border
                px-2 py-1
                text-xs font-semibold
                transition-all
                duration-200
              `,
              store.isSortActive(col.key, 'desc')
                ? `
                    bg-green-100
                    text-green-800
                    shadow-sm
                    ring-2
                    ring-green-100
                  `
                : `
                    bg-white
                    text-slate-700
                    hover:bg-green-50
                    hover:text-green-700
                  `
            ]"
            @click="store.setSort(col.key, 'desc')"
          >
            <span
              :class="[
                `
                  rounded px-1
                  transition-colors
                `,
                store.isSortActive(col.key, 'desc')
                  ? `
                      bg-orange-200
                      text-orange-700
                    `
                  : `
                      bg-orange-100
                      text-orange-600
                    `
              ]"
            >
              Z
            </span>

            Z → A
          </button>
        </div>
      </div>

      <!-- SEARCH -->
      <div class="!border-b !border-slate-200 px-3 py-3">
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
              d="
                M21 21l-4.35-4.35
                M11 18a7 7 0 100-14
                7 7 0 000 14z
              "
            />
          </svg>

          <input
            v-model="store.searchFilters[col.key]"
            type="text"
            :placeholder="`Search ${cleanLabel(col.label)}...`"
            class="w-full rounded-xl !border !border-slate-200 py-1.5 pl-10 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400! focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <!-- SELECT ALL DAN CLEAR -->
      <div class="flex items-center justify-between px-4 py-2 !border-b !border-slate-200">
        <label class="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            :checked="isAllSelected"
            class="h-4 w-4 rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
            @change="store.toggleAllColumn(col.key)"
          />

          Select All
        </label>

        <button
          type="button"
          class="text-xs font-semibold text-red-500 transition-colors hover:text-red-700"
          @click="store.clearColumnFilter(col.key)"
        >
          Clear Filter
        </button>
      </div>

      <!-- LIST OPTION -->
      <div class="max-h-[220px] overflow-y-auto !border-t !border-slate-100 py-1">
        <label
          v-for="option in filteredOptions"
          :key="option"
          class="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50"
        >
          <input
            type="checkbox"
              :checked="
                store.isFilterSelected(
                  col.key,
                  option
                )
              "
            class="ml-1 h-4 w-4 rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
            @change="store.toggleFilter(col.key, option)"
          />

          <span class="min-w-0 flex-1 truncate" :title="option">
            {{ option }}
          </span>
        </label>

        <div v-if="filteredOptions.length === 0" class="px-3 py-8 text-center text-xs text-slate-400">
          Data tidak ditemukan
        </div>
      </div>
    </div>
  </Teleport>
</template>
