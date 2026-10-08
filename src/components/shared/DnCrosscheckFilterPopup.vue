<script setup lang="ts">
import { computed } from 'vue';
import { useCustomerOrderStore } from '@/stores/Marketing/UploadSo';
import {
  DATE_FILTER_SEARCH_HELPER,
  isDateFilterColumn
} from '@/utils/dateFilterHelper';

import type {
  DnCrosscheckKey
} from '@/types/Marketing/UploadSo';

type CustomerOrderStore =
  ReturnType<
    typeof useCustomerOrderStore
  >;

const props = defineProps<{
  col: {
    key: DnCrosscheckKey;
    label: string;
  };

  store: CustomerOrderStore;
}>();

const cleanLabel = (
  label: string
): string => {
  return String(label ?? '')
    .replace(/\n/g, ' ')
    .trim();
};

const isDateColumn = computed(() =>
  isDateFilterColumn(String(props.col.key), props.col.label)
);

const onSearchInput = (
  event: Event
): void => {
  const input =
    event.target as HTMLInputElement;

  props.store
    .setDnCrosscheckSearchValue(
      props.col.key,
      input.value
    );
};
const filteredOptions = computed(() =>
  props.store.getDnCrosscheckFilteredColumnOptions(props.col.key)
);
const isAllSelected = computed(() =>
  filteredOptions.value.length > 0 &&
  filteredOptions.value.every((option) =>
    props.store.isDnCrosscheckFilterSelected(props.col.key, option)
  )
);
const isRemoteLoading = computed(() =>
  props.store.isDnCrosscheckFilterOptionLoading(props.col.key)
);
const isRemoteSearch = computed(() =>
  props.store.isDnCrosscheckRemoteSearch(props.col.key)
);
const searchLength = computed(() =>
  props.store.getDnCrosscheckSearchValue(props.col.key).trim().length
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="
        store.dnCrosscheckOpenFilters[
          col.key
        ]
      "
      class="
        fixed
        z-[99999]
        flex
        w-[270px]
        flex-col
        overflow-hidden
        rounded-2xl
        !border
        !border-slate-200
        bg-white
        pb-1
        text-left
        shadow-[0_20px_50px_rgba(15,23,42,0.25)]
      "
      :style="{
        top:
          `${store.dnCrosscheckFilterPopupPosition.top}px`,

        left:
          `${store.dnCrosscheckFilterPopupPosition.left}px`,

        maxHeight:
          `${store.dnCrosscheckFilterPopupPosition.maxHeight}px`
      }"
      @click.stop
    >
      
      <!-- Close -->
      

      <button
        type="button"
        aria-label="Tutup filter"
        title="Tutup"
        class="
          absolute
          right-2
          top-2
          z-10
          flex
          h-7
          w-7
          items-center
          justify-center
          rounded-full
          !border
          !border-slate-200
          bg-white
          text-slate-400
          shadow-sm
          transition-all
          hover:!border-red-200
          hover:bg-red-50
          hover:text-red-500
          active:scale-90
        "
        @click.stop="
          store.closeDnCrosscheckFilter()
        "
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
            d="
              M6 6l12 12
              M18 6L6 18
            "
          />
        </svg>
      </button>

      
      <!-- Sort -->
      

      <div
        class="
          flex-none
          !border-b
          !border-slate-200
          bg-slate-50
          px-4
          pb-2
          pt-6
        "
      >
        <div
          class="
            mb-1
            text-xs
            font-bold
            uppercase
            text-slate-500
          "
        >
          Sort
        </div>

        <div
          class="
            grid
            grid-cols-3
            gap-2
          "
        >
          <!-- None -->

          <button
            type="button"
            :aria-pressed="
              store.getDnCrosscheckSortDirection(
                col.key
              ) === 'none'
            "
            :class="[
              `
                flex
                items-center
                justify-center
                gap-1
                rounded-xl
                !border
                px-2
                py-1.5
                text-xs
                font-semibold
                transition-all
              `,

              store.getDnCrosscheckSortDirection(
                col.key
              ) === 'none'
                ? `
                    !border-blue-400
                    bg-blue-50
                    text-blue-700
                    ring-2
                    ring-blue-100
                  `
                : `
                    !border-slate-200
                    bg-white
                    text-slate-700
                    hover:!border-blue-300
                    hover:bg-blue-50
                  `
            ]"
            @click="
              store.setDnCrosscheckSort(
                col.key,
                'none'
              )
            "
          >
            <span
              class="
                rounded
                bg-white
                px-1
              "
            >
              ↕
            </span>

            None
          </button>

          <!-- Asc -->

          <button
            type="button"
            :aria-pressed="
              store.getDnCrosscheckSortDirection(
                col.key
              ) === 'asc'
            "
            :class="[
              `
                flex
                items-center
                justify-center
                gap-1
                rounded-xl
                !border
                px-2
                py-1.5
                text-xs
                font-semibold
                transition-all
              `,

              store.getDnCrosscheckSortDirection(
                col.key
              ) === 'asc'
                ? `
                    !border-blue-400
                    bg-blue-50
                    text-blue-700
                    ring-2
                    ring-blue-100
                  `
                : `
                    !border-slate-200
                    bg-white
                    text-slate-700
                    hover:!border-blue-300
                    hover:bg-blue-50
                  `
            ]"
            @click="
              store.setDnCrosscheckSort(
                col.key,
                'asc'
              )
            "
          >
            <span
              class="
                rounded
                bg-blue-100
                px-1
                text-blue-600
              "
            >
              A
            </span>

            A → Z
          </button>

          <!-- Desc -->

          <button
            type="button"
            :aria-pressed="
              store.getDnCrosscheckSortDirection(
                col.key
              ) === 'desc'
            "
            :class="[
              `
                flex
                items-center
                justify-center
                gap-1
                rounded-xl
                !border
                px-2
                py-1.5
                text-xs
                font-semibold
                transition-all
              `,

              store.getDnCrosscheckSortDirection(
                col.key
              ) === 'desc'
                ? `
                    !border-blue-400
                    bg-blue-50
                    text-blue-700
                    ring-2
                    ring-blue-100
                  `
                : `
                    !border-slate-200
                    bg-white
                    text-slate-700
                    hover:!border-blue-300
                    hover:bg-blue-50
                  `
            ]"
            @click="
              store.setDnCrosscheckSort(
                col.key,
                'desc'
              )
            "
          >
            <span
              class="
                rounded
                bg-orange-100
                px-1
                text-orange-600
              "
            >
              Z
            </span>

            Z → A
          </button>
        </div>
      </div>

      
      <!-- Search -->
      

      <div
        class="
          flex-none
          !border-b
          !border-slate-200
          px-3
          py-3
        "
      >
        <div class="relative">
          <svg
            class="
              pointer-events-none
              absolute
              left-3
              top-1/2
              h-4
              w-4
              -translate-y-1/2
              text-slate-400
            "
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
            :value="
              store.getDnCrosscheckSearchValue(
                col.key
              )
            "
            type="text"
            :placeholder="
              `Search ${cleanLabel(col.label)}...`
            "
            class="
              w-full
              rounded-xl
              !border
              !border-slate-200
              py-2
              pl-9
              pr-3
              text-xs
              text-slate-700
              outline-none
              transition-all
              placeholder:text-slate-400
              focus:!border-blue-400
              focus:ring-2
              focus:ring-blue-100
            "
            @input="
              onSearchInput
            "
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

      
      <!-- Select All / Clear -->
      

      <div
        class="
          flex
          flex-none
          items-center
          justify-between
          !border-b
          !border-slate-200
          px-4
          py-2
        "
      >
        <label
          class="
            flex
            cursor-pointer
            items-center
            gap-2
            text-xs
            font-semibold
            text-slate-700
          "
        >
          <input
            type="checkbox"
            :checked="isAllSelected"
            class="
              h-4
              w-4
              cursor-pointer
              rounded
              !border
              !border-slate-400
              text-blue-600
              focus:ring-blue-500
            "
            @change="
              store.toggleAllDnCrosscheckColumn(
                col.key
              )
            "
          />

          <span>
            Select All
          </span>
        </label>

        <button
          type="button"
          class="
            text-xs
            font-semibold
            text-red-500
            transition
            hover:text-red-600
            hover:underline
          "
          @click.stop="
            store.clearDnCrosscheckColumnFilter(
              col.key
            )
          "
        >
          Clear Filter
        </button>
      </div>

      
      <!-- Options -->
      

      <div
        class="
          min-h-0
          flex-1
          overflow-y-auto
        "
      >
        <label
          v-for="option in filteredOptions"
          :key="
            option
          "
          class="
            flex
            cursor-pointer
            items-center
            gap-3
            px-3
            py-2
            text-xs
            text-slate-700
            transition
            hover:bg-slate-50
          "
        >
          <input
            type="checkbox"
            :checked="
              store.isDnCrosscheckFilterSelected(
                col.key,
                option
              )
            "
            class="
              ml-1
              h-4
              w-4
              cursor-pointer
              rounded
              !border
              !border-slate-400
              text-blue-600
              focus:ring-blue-500
            "
            @change="
              store.toggleDnCrosscheckFilterValue(
                col.key,
                option
              )
            "
          />

          <span
            class="
              min-w-0
              flex-1
              whitespace-pre-line
              leading-tight
            "
            :title="
              option
            "
          >
            {{ option }}
          </span>
        </label>

        <!-- Empty -->

        <div
          v-if="filteredOptions.length === 0"
          class="
            px-4
            py-5
            text-center
            text-xs
            text-slate-400
          "
        >
          <span v-if="isRemoteLoading">Mencari...</span>
          <span v-else-if="searchLength > 0 && searchLength < 3">Ketik min. 3 karakter untuk cari semua data</span>
          <span v-else-if="isRemoteSearch">Tidak ditemukan</span>
          <span v-else>Tidak ada data</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
