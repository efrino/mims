<script setup lang="ts">
import { computed } from 'vue';
import { useCustomerOrderStore } from '@/stores/Marketing/UploadSo';
import {
  DATE_FILTER_SEARCH_HELPER,
  isDateFilterColumn
} from '@/utils/dateFilterHelper';
import type {
  Card2Key,
  TmminRawSoKey,
  NtcRawSoKey,
  GayaRawSoKey,
  DcwaRawSoKey,
  AsiAdmRawSoKey,
  DpmRawSoKey,
  FtiRawSoKey,
  MesRawSoKey
} from '@/types/Marketing/UploadSo';

type CustomerOrderStore =
  ReturnType<typeof useCustomerOrderStore>;

type RawFilterKey =
  | Card2Key
  | TmminRawSoKey
  | NtcRawSoKey
  | GayaRawSoKey
  | DcwaRawSoKey
  | AsiAdmRawSoKey
  | DpmRawSoKey
  | FtiRawSoKey
  | MesRawSoKey;

const props = withDefaults(
  defineProps<{
    col: {
      key: RawFilterKey;
      label: string;
    };
    store: CustomerOrderStore;
    mode?: 'adm' | 'tmmin' | 'ntc' | 'gaya' | 'dcwa' | 'asi' | 'dpm' | 'fti' | 'mes';
  }>(),
  {
    mode: 'adm'
  }
);

const isTmminMode = computed(
  () => props.mode === 'tmmin'
);

const isNtcMode = computed(
  () => props.mode === 'ntc'
);

const isGayaMode = computed(
  () => props.mode === 'gaya'
);

const isDcwaMode = computed(
  () => props.mode === 'dcwa'
);

const isAsiMode = computed(
  () => props.mode === 'asi'
);

const isDpmMode = computed(
  () => props.mode === 'dpm'
);

const isFtiMode = computed(
  () => props.mode === 'fti'
);

const isMesMode = computed(
  () => props.mode === 'mes'
);

const cleanLabel = (
  label: string
): string => {
  return label.replace(/\n/g, ' ');
};

const isDateColumn = computed(() =>
  isDateFilterColumn(String(props.col.key), props.col.label)
);

const tmminKey = (): TmminRawSoKey => {
  return props.col.key as TmminRawSoKey;
};

const ntcKey = (): NtcRawSoKey => {
  return props.col.key as NtcRawSoKey;
};

const gayaKey = (): GayaRawSoKey => {
  return props.col.key as GayaRawSoKey;
};

const dcwaKey = (): DcwaRawSoKey => {
  return props.col.key as DcwaRawSoKey;
};

const asiKey = (): AsiAdmRawSoKey => {
  return props.col.key as AsiAdmRawSoKey;
};

const dpmKey = (): DpmRawSoKey => {
  return props.col.key as DpmRawSoKey;
};

const ftiKey = (): FtiRawSoKey => {
  return props.col.key as FtiRawSoKey;
};

const mesKey = (): MesRawSoKey => {
  return props.col.key as MesRawSoKey;
};

const admKey = (): Card2Key => {
  return props.col.key as Card2Key;
};

const isOpen = computed(() => {
  if (isMesMode.value) {
    return Boolean(props.store.mesRawSoOpenFilters[mesKey()]);
  }

  if (isFtiMode.value) {
    return Boolean(props.store.ftiRawSoOpenFilters[ftiKey()]);
  }

  if (isDpmMode.value) {
    return Boolean(
      props.store.dpmRawSoOpenFilters[dpmKey()]
    );
  }

  if (isAsiMode.value) {
    return Boolean(
      props.store.asiAdmRawSoOpenFilters[asiKey()]
    );
  }


  if (isDcwaMode.value) {
    return Boolean(
      props.store.dcwaRawSoOpenFilters[dcwaKey()]
    );
  }

  if (isGayaMode.value) {
    return Boolean(
      props.store.gayaRawSoOpenFilters[gayaKey()]
    );
  }

  if (isNtcMode.value) {
    return Boolean(
      props.store
        .ntcRawSoOpenFilters[
      ntcKey()
      ]
    );
  }

  return isTmminMode.value
    ? Boolean(
      props.store
        .tmminRawSoOpenFilters[
      tmminKey()
      ]
    )
    : Boolean(
      props.store
        .card2OpenFilters[
      admKey()
      ]
    );
});

const popupPosition = computed(() => {
  if (isMesMode.value) {
    return props.store.mesRawSoFilterPopupPosition;
  }

  if (isFtiMode.value) {
    return props.store.ftiRawSoFilterPopupPosition;
  }

  if (isDpmMode.value) {
    return props.store.dpmRawSoFilterPopupPosition;
  }

  if (isAsiMode.value) {
    return props.store
      .asiAdmRawSoFilterPopupPosition;
  }


  if (isDcwaMode.value) {
    return props.store
      .dcwaRawSoFilterPopupPosition;
  }

  if (isGayaMode.value) {
    return props.store.gayaRawSoFilterPopupPosition;
  }

  if (isNtcMode.value) {
    return props.store
      .ntcRawSoFilterPopupPosition;
  }

  return isTmminMode.value
    ? props.store
      .tmminRawSoFilterPopupPosition
    : props.store
      .card2FilterPopupPosition;
});

const closeFilter = (): void => {
  if (isMesMode.value) {
    props.store.closeMesRawSoFilter();
    return;
  }

  if (isFtiMode.value) {
    props.store.closeFtiRawSoFilter();
    return;
  }

  if (isDpmMode.value) {
    props.store.closeDpmRawSoFilter();
    return;
  }

  if (isAsiMode.value) {
    props.store.closeAsiAdmRawSoFilter();
    return;
  }


  if (isDcwaMode.value) {
    props.store.closeDcwaRawSoFilter();
    return;
  }

  if (isGayaMode.value) {
    props.store.closeGayaRawSoFilter();
    return;
  }

  if (isNtcMode.value) {
    props.store.closeNtcRawSoFilter();
    return;
  }

  if (isTmminMode.value) {
    props.store.closeTmminRawSoFilter();
    return;
  }

  props.store.closeCard2Filter();
};

const isNoSortActive = (): boolean => {
  if (isMesMode.value) {
    return props.store.isMesRawSoNoSortActive(mesKey());
  }

  if (isFtiMode.value) {
    return props.store.isFtiRawSoNoSortActive(ftiKey());
  }

  if (isDpmMode.value) {
    return props.store.isDpmRawSoNoSortActive(dpmKey());
  }

  if (isAsiMode.value) {
    return props.store
      .isAsiAdmRawSoNoSortActive(
        asiKey()
      );
  }


  if (isDcwaMode.value) {
    return props.store
      .isDcwaRawSoNoSortActive(
        dcwaKey()
      );
  }

  if (isGayaMode.value) {
    return props.store.isGayaRawSoNoSortActive(gayaKey());
  }

  if (isNtcMode.value) {
    return props.store
      .isNtcRawSoNoSortActive(
        ntcKey()
      );
  }

  return isTmminMode.value
    ? props.store
      .isTmminRawSoNoSortActive(
        tmminKey()
      )
    : props.store
      .isCard2NoSortActive(
        admKey()
      );
};

const isSortActive = (
  direction: 'asc' | 'desc'
): boolean => {
  if (isMesMode.value) {
    return props.store.isMesRawSoSortActive(mesKey(), direction);
  }

  if (isFtiMode.value) {
    return props.store.isFtiRawSoSortActive(ftiKey(), direction);
  }

  if (isDpmMode.value) {
    return props.store.isDpmRawSoSortActive(dpmKey(), direction);
  }

  if (isAsiMode.value) {
    return props.store
      .isAsiAdmRawSoSortActive(
        asiKey(),
        direction
      );
  }


  if (isDcwaMode.value) {
    return props.store
      .isDcwaRawSoSortActive(
        dcwaKey(),
        direction
      );
  }

  if (isGayaMode.value) {
    return props.store.isGayaRawSoSortActive(gayaKey(), direction);
  }

  if (isNtcMode.value) {
    return props.store
      .isNtcRawSoSortActive(
        ntcKey(),
        direction
      );
  }

  return isTmminMode.value
    ? props.store
      .isTmminRawSoSortActive(
        tmminKey(),
        direction
      )
    : props.store
      .isCard2SortActive(
        admKey(),
        direction
      );
};

const setSort = (
  direction:
    | 'none'
    | 'asc'
    | 'desc'
): void => {
  if (isMesMode.value) {
    props.store.setMesRawSoSort(mesKey(), direction);
    return;
  }

  if (isFtiMode.value) {
    props.store.setFtiRawSoSort(ftiKey(), direction);
    return;
  }

  if (isDpmMode.value) {
    props.store.setDpmRawSoSort(dpmKey(), direction);
    return;
  }

  if (isAsiMode.value) {
    props.store.setAsiAdmRawSoSort(
      asiKey(),
      direction
    );
    return;
  }


  if (isDcwaMode.value) {
    props.store.setDcwaRawSoSort(
      dcwaKey(),
      direction
    );
    return;
  }

  if (isGayaMode.value) {
    props.store.setGayaRawSoSort(gayaKey(), direction);
    return;
  }

  if (isNtcMode.value) {
    props.store.setNtcRawSoSort(
      ntcKey(),
      direction
    );
    return;
  }

  if (isTmminMode.value) {
    props.store.setTmminRawSoSort(
      tmminKey(),
      direction
    );
    return;
  }

  props.store.setSort(
    admKey(),
    direction
  );
};

const getSearchValue = (): string => {
  if (isMesMode.value) {
    return props.store.getMesRawSoSearchValue(mesKey());
  }

  if (isFtiMode.value) {
    return props.store.getFtiRawSoSearchValue(ftiKey());
  }

  if (isDpmMode.value) {
    return props.store.getDpmRawSoSearchValue(dpmKey());
  }

  if (isAsiMode.value) {
    return props.store
      .getAsiAdmRawSoSearchValue(
        asiKey()
      );
  }


  if (isDcwaMode.value) {
    return props.store
      .getDcwaRawSoSearchValue(
        dcwaKey()
      );
  }

  if (isGayaMode.value) {
    return props.store.getGayaRawSoSearchValue(gayaKey());
  }

  if (isNtcMode.value) {
    return props.store
      .getNtcRawSoSearchValue(
        ntcKey()
      );
  }

  return isTmminMode.value
    ? props.store
      .getTmminRawSoSearchValue(
        tmminKey()
      )
    : props.store
      .getCard2SearchValue(
        admKey()
      );
};

const onSearchInput = (
  event: Event
): void => {
  const input =
    event.target as HTMLInputElement;

  props.store.queueRawFilterOptionSearch(
    props.mode,
    String(props.col.key),
    input.value
  );

  if (isMesMode.value) {
    props.store.setMesRawSoSearchValue(mesKey(), input.value);
    return;
  }

  if (isFtiMode.value) {
    props.store.setFtiRawSoSearchValue(ftiKey(), input.value);
    return;
  }

  if (isDpmMode.value) {
    props.store.setDpmRawSoSearchValue(dpmKey(), input.value);
    return;
  }

  if (isAsiMode.value) {
    props.store
      .setAsiAdmRawSoSearchValue(
        asiKey(),
        input.value
      );
    return;
  }

  if (isDcwaMode.value) {
    props.store
      .setDcwaRawSoSearchValue(
        dcwaKey(),
        input.value
      );
    return;
  }

  if (isGayaMode.value) {
    props.store.setGayaRawSoSearchValue(gayaKey(), input.value);
    return;
  }

  if (isNtcMode.value) {
    props.store
      .setNtcRawSoSearchValue(
        ntcKey(),
        input.value
      );
    return;
  }

  if (isTmminMode.value) {
    props.store
      .setTmminRawSoSearchValue(
        tmminKey(),
        input.value
      );
    return;
  }

  props.store.setCard2SearchValue(
    admKey(),
    input.value
  );
};

const isAllSelected = (): boolean => {
  return options.value.length > 0 &&
    options.value.every((option) => isFilterSelected(option));
};

const toggleAll = (): void => {
  props.store.toggleAllRawFilterOptions(
    props.mode,
    String(props.col.key)
  );
};

const clearFilter = (): void => {
  if (isMesMode.value) {
    props.store.clearMesRawSoColumnFilter(mesKey());
  } else if (isFtiMode.value) {
    props.store.clearFtiRawSoColumnFilter(ftiKey());
  } else if (isDpmMode.value) {
    props.store.clearDpmRawSoColumnFilter(dpmKey());
  } else if (isAsiMode.value) {
    props.store.clearAsiAdmRawSoColumnFilter(asiKey());
  } else if (isDcwaMode.value) {
    props.store.clearDcwaRawSoColumnFilter(dcwaKey());
  } else if (isGayaMode.value) {
    props.store.clearGayaRawSoColumnFilter(gayaKey());
  } else if (isNtcMode.value) {
    props.store.clearNtcRawSoColumnFilter(ntcKey());
  } else if (isTmminMode.value) {
    props.store.clearTmminRawSoColumnFilter(tmminKey());
  } else {
    props.store.clearCard2ColumnFilter(admKey());
  }

  props.store.queueRawFilterOptionSearch(props.mode, String(props.col.key), '');
  props.store.scheduleRawServerFilterReload(props.mode);
};

const options = computed(() =>
  props.store.getRawFilterPopupOptions(
    props.mode,
    String(props.col.key)
  )
);

const isRemoteLoading = computed(() =>
  props.store.isRawFilterOptionLoading(props.mode, String(props.col.key))
);

const isRemoteSearch = computed(() =>
  props.store.isRawFilterRemoteSearchActive(props.mode, String(props.col.key))
);

const selectAllLabel = computed(() =>
  props.store.isRawFilterServerPaged(props.mode)
    ? 'Select Shown'
    : 'Select All'
);

const searchLength = computed(() => getSearchValue().trim().length);

const isFilterSelected = (
  value: string
): boolean => {
  if (isMesMode.value) {
    return props.store.isMesRawSoFilterSelected(mesKey(), value);
  }

  if (isFtiMode.value) {
    return props.store.isFtiRawSoFilterSelected(ftiKey(), value);
  }

  if (isDpmMode.value) {
    return props.store.isDpmRawSoFilterSelected(dpmKey(), value);
  }

  if (isAsiMode.value) {
    return props.store
      .isAsiAdmRawSoFilterSelected(
        asiKey(),
        value
      );
  }


  if (isDcwaMode.value) {
    return props.store
      .isDcwaRawSoFilterSelected(
        dcwaKey(),
        value
      );
  }

  if (isGayaMode.value) {
    return props.store.isGayaRawSoFilterSelected(gayaKey(), value);
  }

  if (isNtcMode.value) {
    return props.store
      .isNtcRawSoFilterSelected(
        ntcKey(),
        value
      );
  }

  return isTmminMode.value
    ? props.store
      .isTmminRawSoFilterSelected(
        tmminKey(),
        value
      )
    : props.store
      .isCard2FilterSelected(
        admKey(),
        value
      );
};

const toggleFilter = (
  value: string
): void => {
  if (isMesMode.value) {
    props.store.toggleMesRawSoFilterValue(mesKey(), value);
  } else if (isFtiMode.value) {
    props.store.toggleFtiRawSoFilterValue(ftiKey(), value);
  } else if (isDpmMode.value) {
    props.store.toggleDpmRawSoFilterValue(dpmKey(), value);
  } else if (isAsiMode.value) {
    props.store.toggleAsiAdmRawSoFilter(asiKey(), value);
  } else if (isDcwaMode.value) {
    props.store.toggleDcwaRawSoFilter(dcwaKey(), value);
  } else if (isGayaMode.value) {
    props.store.toggleGayaRawSoFilter(gayaKey(), value);
  } else if (isNtcMode.value) {
    props.store.toggleNtcRawSoFilter(ntcKey(), value);
  } else if (isTmminMode.value) {
    props.store.toggleTmminRawSoFilter(tmminKey(), value);
  } else {
    props.store.toggleCard2Filter(admKey(), value);
  }

  props.store.scheduleRawServerFilterReload(props.mode);
};

</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed z-[99999] flex w-[270px] flex-col overflow-hidden rounded-2xl !border !border-slate-200 bg-white pb-2 text-left shadow-[0_20px_50px_rgba(15,23,42,0.25)]"
      :style="{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
        maxHeight: `${popupPosition.maxHeight}px`
      }"
      @click.stop
    >
      <!-- Close popup -->
      <button
        type="button"
        aria-label="Tutup filter"
        title="Tutup"
        class="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full !border !border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:!border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
        @click.stop="closeFilter"
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

      <!-- Sorting -->
      <div class="flex-none !border-b !border-slate-200 bg-slate-50 px-4 pb-2 pt-6">
        <div class="mb-1 text-xs font-bold uppercase text-slate-500">
          Sort
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            :aria-pressed="isNoSortActive()"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl !border px-2 py-1 text-xs font-semibold transition-all',
              isNoSortActive()
                ? '!border-green-400 bg-green-100 text-green-800 ring-2 ring-green-100'
                : '!border-slate-200 bg-white text-slate-700 hover:!border-green-300 hover:bg-green-50'
            ]"
            @click="setSort('none')"
          >
            <span class="rounded bg-white px-1">↕</span>
            None
          </button>

          <button
            type="button"
            :aria-pressed="isSortActive('asc')"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl !border px-2 py-1 text-xs font-semibold transition-all',
              isSortActive('asc')
                ? '!border-green-400 bg-green-100 text-green-800 ring-2 ring-green-100'
                : '!border-slate-200 bg-white text-slate-700 hover:!border-green-300 hover:bg-green-50'
            ]"
            @click="setSort('asc')"
          >
            <span class="rounded bg-green-100 px-1 text-green-600">A</span>
            A → Z
          </button>

          <button
            type="button"
            :aria-pressed="isSortActive('desc')"
            :class="[
              'flex items-center justify-center gap-1 rounded-xl !border px-2 py-1 text-xs font-semibold transition-all',
              isSortActive('desc')
                ? '!border-green-400 bg-green-100 text-green-800 ring-2 ring-green-100'
                : '!border-slate-200 bg-white text-slate-700 hover:!border-green-300 hover:bg-green-50'
            ]"
            @click="setSort('desc')"
          >
            <span class="rounded bg-orange-100 px-1 text-orange-600">Z</span>
            Z → A
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="flex-none !border-b !border-slate-200 px-3 py-3">
        <div class="relative">
          <svg
            class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
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
            :value="getSearchValue()"
            type="text"
            :placeholder="`Search ${cleanLabel(col.label)}...`"
            class="w-full rounded-xl !border !border-slate-200 py-1 pl-10 pr-3 text-xs outline-none focus:!border-blue-400 focus:ring-2 focus:ring-blue-100"
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
            :checked="isAllSelected()"
            class="h-4 w-4 cursor-pointer rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
            @change="toggleAll"
          />

          <span>{{ selectAllLabel }}</span>
        </label>

        <button
          type="button"
          class="text-xs font-semibold text-red-500 transition hover:text-red-600 hover:underline"
          @click.stop="clearFilter"
        >
          Clear Filter
        </button>
      </div>

      <!-- Options -->
      <div class="min-h-0 flex-1 overflow-y-auto">
        <label
          v-for="option in options"
          :key="option"
          class="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs hover:bg-blue-50"
        >
          <input
            type="checkbox"
            :checked="isFilterSelected(option)"
            class="ml-1 h-4 w-4 cursor-pointer rounded !border !border-slate-400 text-blue-600 focus:ring-blue-500"
            @change="toggleFilter(option)"
          />

          <span
            class="min-w-0 flex-1 whitespace-pre-line leading-tight"
            :title="option"
          >
            {{ option }}
          </span>
        </label>

        <div
          v-if="options.length === 0"
          class="px-4 py-4 text-center text-xs text-slate-400"
        >
          <span v-if="isRemoteLoading">Mencari...</span>
          <span v-else-if="searchLength > 0 && searchLength < 3">Ketik minimal 3 karakter</span>
          <span v-else-if="isRemoteSearch">Tidak ditemukan</span>
          <span v-else>Tidak ada data</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
