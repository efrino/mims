<script setup lang="ts">
import { computed } from 'vue'
import {
  useQuotationTrackingStore
} from '@/stores/Marketing/QuotationTrackingStore'

import type {
  QuotationTrackingKey
} from '@/types/Marketing/QuotationTracking'

type QuotationTrackingStore =
  ReturnType<
    typeof useQuotationTrackingStore
  >

const props = defineProps<{
  col: {
    key:
      QuotationTrackingKey
    label: string
  }

  store:
    QuotationTrackingStore
}>()

const cleanLabel = (
  label: string
): string => {
  return label.replace(
    /\n/g,
    ' '
  )
}

const onSearchInput = (
  event: Event
) => {
  const input =
    event.target as
      HTMLInputElement

  props.store.setSearchValue(
    props.col.key,
    input.value
  )
}
const filteredOptions = computed(() =>
  props.store.getFilteredOptions(props.col.key)
)
const isAllSelected = computed(() =>
  filteredOptions.value.length > 0 &&
  filteredOptions.value.every((option) =>
    props.store.isFilterSelected(props.col.key, option)
  )
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="
        store.openFilters[
          col.key
        ]
      "
      class="
        fixed
        z-[99999]
        flex
        w-[300px]
        flex-col
        overflow-hidden
        rounded-2xl
        !border
        !border-slate-200
        bg-white
        pb-2
        text-left
        shadow-[0_20px_50px_rgba(15,23,42,0.25)]
      "
      :style="{
        top:
          `${store.filterPopupPosition.top}px`,

        left:
          `${store.filterPopupPosition.left}px`,

        maxHeight:
          `${store.filterPopupPosition.maxHeight}px`
      }"
      @click.stop
    >
      <!-- CLOSE -->
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
          hover:border-red-200!
          hover:bg-red-50
          hover:text-red-500
          active:scale-90
        "
        @click.stop="
          store.closeTrackingFilter()
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
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      </button>

      <!-- SORT -->
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
          <button
            type="button"
            :class="[
              `
                flex
                items-center
                justify-center
                gap-1
                rounded-xl
                border
                px-1
                py-0.5
                text-xs
                font-semibold
                transition-all
              `,

              store.getTrackingSortDirection(
                col.key
              ) === 'none'
                ? `
                    bg-green-100
                    text-green-800
                    ring-2
                    ring-green-100
                  `
                : `
                    bg-white
                    text-slate-700
                    hover:border-green-300
                    hover:bg-green-50
                  `
            ]"
            @click="
              store.setTrackingSort(
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

          <button
            type="button"
            :class="[
              `
                flex
                items-center
                justify-center
                gap-1
                rounded-xl
                border
                px-2
                py-0.5
                text-xs
                font-semibold
                transition-all
              `,

              store.getTrackingSortDirection(
                col.key
              ) === 'asc'
                ? `
                    bg-green-100
                    text-green-800
                    ring-2
                    ring-green-100
                  `
                : `
                    bg-white
                    text-slate-700
                    hover:border-green-300
                    hover:bg-green-50
                  `
            ]"
            @click="
              store.setTrackingSort(
                col.key,
                'asc'
              )
            "
          >
            <span
              class="
                rounded
                bg-emerald-100
                px-1
                text-emerald-600
              "
            >
              A
            </span>

            A → Z
          </button>

          <button
            type="button"
            :class="[
              `
                flex
                items-center
                justify-center
                gap-1
                rounded-xl
                border
                px-2
                py-0.5
                text-xs
                font-semibold
                transition-all
              `,

              store.getTrackingSortDirection(
                col.key
              ) === 'desc'
                ? `
                    bg-green-100
                    text-green-800
                    ring-2
                    ring-green-100
                  `
                : `
                    bg-white
                    text-slate-700
                    hover:border-green-300
                    hover:bg-green-50
                  `
            ]"
            @click="
              store.setTrackingSort(
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

      <!-- SEARCH -->
      <div
        class="
          flex-none
          !border-b
          !border-slate-200
          px-3
          py-2
        "
      >
        <div class="relative">
          <svg
            class="
              absolute
              left-3
              top-1/2
              h-5
              w-5
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
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>

          <input
            :value="
              store.getSearchValue(
                col.key
              )
            "
            type="text"
            :placeholder="
              `Search ${cleanLabel(
                col.label
              )}...`
            "
            class="
              w-full
              rounded-xl
              !border
              !border-slate-200
              py-1.5
              pl-10
              pr-3
              text-xs
              text-slate-700
              outline-none
              focus:border-emerald-400
              focus:ring-2
              focus:ring-emerald-100
            "
            @input="onSearchInput"
          />
        </div>
      </div>

      <!-- FILTER BY COLOR -->
      <div
        v-if="
          store
            .getColumnColorOptions(
              col.key
            )
            .length > 0
        "
        class="
          flex-none
          !border-b
          !border-slate-200
          bg-slate-50/70
          px-4
          py-2
        "
      >
        <div
          class="
            mb-1
            text-xs
            font-bold
            text-slate-500
          "
        >
          Filter by color
        </div>

        <div
          class="
            grid
            grid-cols-3
            gap-1
          "
        >
          <button
            v-for="
              color in
              store.getColumnColorOptions(
                col.key
              )
            "
            :key="color.key"
            type="button"
            :class="[
              `
                flex
                min-w-0
                items-center
                gap-1
                rounded-full
                !border
                bg-white
                px-2
                py-1
                text-[10px]
                transition-all
                hover:bg-emerald-50
              `,

              store.isColorSelected(
                col.key,
                color.key
              )
                ? `!border
                    !border-emerald-500
                    text-emerald-700
                    ring-2
                    ring-emerald-100
                  `
                : ` !border
                    !border-slate-200
                    text-slate-600
                  `
            ]"
            @click.stop="
              store.toggleColorFilter(
                col.key,
                color.key
              )
            "
          >
            <span
              :class="[
                store.colorDotClass(
                  color.key
                ),
                `
                  h-3
                  w-3
                  shrink-0
                  rounded-full
                  !border
                  !border-slate-300
                `
              ]"
            />

            <span class="truncate">
              {{ color.label }}
            </span>
          </button>
        </div>
      </div>

      <!-- SELECT ALL -->
      <div
        class="
          flex
          flex-none
          items-center
          justify-between
          px-4
          py-2
          !border-b !border-slate-200
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
              rounded
              !border
              !border-slate-400
              text-emerald-600
            "
            @change="
              store.toggleAllColumn(
                col.key
              )
            "
          />

          <span>Select All</span>
        </label>

        <button
          type="button"
          class="
            text-xs
            font-semibold
            text-red-500
            hover:underline
          "
          @click.stop="
            store.clearColumnFilter(
              col.key
            )
          "
        >
          Clear Filter
        </button>
      </div>

      <!-- OPTIONS -->
      <div
        class="
          min-h-0
          flex-1
          overflow-y-auto
        "
      >
        <label
          v-for="option in filteredOptions"
          :key="option"
          class="
            flex
            cursor-pointer
            items-center
            gap-3
            px-3
            py-2
            text-xs
            hover:bg-emerald-50
          "
        >
          <input
            type="checkbox"
            :checked="
              store.isFilterSelected(
                col.key,
                option
              )
            "
            class="
              ml-1
              h-4
              w-4
              rounded
              !border
              !border-slate-400
              text-emerald-600
            "
            @change="
              store.toggleFilterValue(
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
            :title="option"
          >
            {{ option }}
          </span>
        </label>

        <div
          v-if="filteredOptions.length === 0"
          class="
            px-4
            py-4
            text-center
            text-xs
            text-slate-400
          "
        >
          No data
        </div>
      </div>
    </div>
  </Teleport>
</template>
