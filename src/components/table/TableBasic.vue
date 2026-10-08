<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
    <!-- Toolbar -->
    <div v-if="!hideToolbar" class="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-gray-200 dark:border-gray-700">
      <!-- Global search input -->
      <div v-if="searchMode === 'global'" class="relative w-60">
        <i class="mdi mdi-magnify absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
        <input
          v-model="globalQuery"
          type="text"
          placeholder="Cari semua kolom..."
          class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-700"
        />
      </div>
      <div v-else class="flex-1" />

      <!-- Slot for extra header actions (export button, etc.) -->
      <!-- Search mode toggle -->
      <!-- <div class="flex items-center gap-2">
        <slot name="header-actions" />

        <div class="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 text-xs shrink-0">
          <button
            @click="setSearchMode('global')"
            class="px-3 py-1 rounded-md font-medium transition-all"
            :class="searchMode === 'global'
              ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            <i class="mdi mdi-magnify mr-1" />Global
          </button>
          <button
            @click="setSearchMode('column')"
            class="px-3 py-1 rounded-md font-medium transition-all"
            :class="searchMode === 'column'
              ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            <i class="mdi mdi-filter-outline mr-1" />Per Kolom
          </button>
        </div>
      </div> -->
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left border-collapse">
        <thead>
          <!-- Column header row -->
          <tr class="bg-sky-100 dark:bg-sky-900/40 border-b border-gray-200 dark:border-gray-700">
            <th
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 whitespace-nowrap w-12 text-center"
            >
              No
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 whitespace-nowrap"
              :class="[
                alignClass(col.align),
                col.sortable !== false ? 'cursor-pointer select-none hover:bg-sky-200 dark:hover:bg-sky-800/40' : ''
              ]"
              :style="col.width ? { width: col.width } : {}"
              @click="col.sortable !== false ? toggleSort(col.key) : undefined"
            >
              <span class="inline-flex items-center gap-1">
                <slot :name="`header-${col.key}`" :column="col">{{ col.label }}</slot>
                <span v-if="col.sortable !== false">
                  <i v-if="sortKey === col.key && sortDir === 'asc'" class="mdi mdi-sort-ascending text-blue-500" />
                  <i v-else-if="sortKey === col.key && sortDir === 'desc'" class="mdi mdi-sort-descending text-blue-500" />
                  <i v-else class="mdi mdi-sort text-gray-400 opacity-60" />
                </span>
              </span>
            </th>
            <th
              v-if="$slots.actions"
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 text-center whitespace-nowrap"
            >
              Aksi
            </th>
          </tr>

          <!-- Per-column filter row -->
          <tr v-if="searchMode === 'column'" class="bg-sky-50 dark:bg-sky-900/20 border-b border-gray-200 dark:border-gray-700">
            <th class="px-2 py-1.5 text-center">
              <i class="mdi mdi-filter text-xs text-gray-400" />
            </th>
            <th v-for="col in columns" :key="col.key" class="px-2 py-1.5">
              <input
                v-if="col.filterable !== false"
                v-model="columnQueries[col.key]"
                type="text"
                placeholder="Filter..."
                class="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:border-blue-500 dark:text-gray-200"
              />
            </th>
            <th v-if="$slots.actions" class="px-2 py-1.5" />
          </tr>
        </thead>

        <tbody>
          <!-- Loading -->
          <tr v-if="loading">
            <td :colspan="totalCols" class="px-4 py-12 text-center text-gray-400">
              <i class="mdi mdi-loading mdi-spin text-3xl block mb-2 text-blue-400" />
              <span class="text-sm">Memuat data...</span>
            </td>
          </tr>

          <!-- Empty -->
          <tr v-else-if="pagedData.length === 0">
            <td :colspan="totalCols" class="px-4 py-12 text-center">
              <slot name="empty">
                <i class="mdi mdi-table-off text-3xl block mb-2 text-gray-300" />
                <span class="text-sm text-gray-400">Tidak ada data</span>
              </slot>
            </td>
          </tr>

          <!-- Data rows -->
          <tr
            v-else
            v-for="(row, rIdx) in pagedData"
            :key="rIdx"
            class="border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800/60 transition-colors"
            :class="rIdx % 2 !== 0 ? 'bg-gray-50 dark:bg-gray-800/30' : 'bg-white dark:bg-transparent'"
          >
            <td class="px-4 py-2.5 text-center text-gray-400 text-xs font-medium">
              {{ (currentPage - 1) * itemsPerPage + rIdx + 1 }}
            </td>
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs"
              :class="alignClass(col.align)"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="(currentPage - 1) * itemsPerPage + rIdx">
                {{ row[col.key] ?? '-' }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="px-4 py-2.5 text-center">
              <slot name="actions" :row="row" :index="(currentPage - 1) * itemsPerPage + rIdx" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!hidePagination" class="border-t border-gray-200 dark:border-gray-700">
      <Pagination
        :total-items="totalItems"
        :current-page="currentPage"
        :items-per-page="itemsPerPage"
        :per-page-options="perPageOptions"
        @update:current-page="currentPage = $event"
        @update:items-per-page="
          itemsPerPage = $event;
          currentPage = 1;
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, useSlots } from 'vue';
import Pagination from '@/components/table/Pagination.vue';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean; // default: true
  filterable?: boolean; // show per-column filter input, default: true
  align?: 'left' | 'center' | 'right';
  width?: string; // fixed column width e.g. '120px'
}

interface Props {
  columns: TableColumn[];
  data: Record<string, unknown>[];
  loading?: boolean;
  perPageOptions?: number[];
  initialItemsPerPage?: number;
  initialSearchMode?: 'global' | 'column';
  hideToolbar?: boolean;
  hidePagination?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  perPageOptions: () => [10, 25, 50, 100],
  initialItemsPerPage: 10,
  initialSearchMode: 'global',
  hideToolbar: false,
  hidePagination: false
});

// ── Search ──────────────────────────────────────────────────────────
const searchMode = ref<'global' | 'column'>(props.initialSearchMode);
const globalQuery = ref('');
const columnQueries = reactive<Record<string, string>>(Object.fromEntries(props.columns.map((c) => [c.key, ''])));

function setSearchMode(mode: 'global' | 'column') {
  searchMode.value = mode;
  globalQuery.value = '';
  Object.keys(columnQueries).forEach((k) => (columnQueries[k] = ''));
  currentPage.value = 1;
}

// ── Sort ────────────────────────────────────────────────────────────
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
  currentPage.value = 1;
}

// ── Pagination ───────────────────────────────────────────────────────
const currentPage = ref(1);
const itemsPerPage = ref(props.initialItemsPerPage);

watch([globalQuery, sortKey, sortDir, itemsPerPage], () => {
  currentPage.value = 1;
});
watch(
  columnQueries,
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

// ── Filtered + sorted data ───────────────────────────────────────────
const filteredData = computed(() => {
  let rows = [...props.data];

  if (searchMode.value === 'global' && globalQuery.value.trim()) {
    const q = globalQuery.value.trim().toLowerCase();
    rows = rows.filter((row) =>
      props.columns.some((col) =>
        String(row[col.key] ?? '')
          .toLowerCase()
          .includes(q)
      )
    );
  } else if (searchMode.value === 'column') {
    for (const col of props.columns) {
      const q = (columnQueries[col.key] ?? '').trim().toLowerCase();
      if (q)
        rows = rows.filter((row) =>
          String(row[col.key] ?? '')
            .toLowerCase()
            .includes(q)
        );
    }
  }

  if (sortKey.value) {
    const key = sortKey.value;
    rows.sort((a, b) => {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir.value === 'asc' ? cmp : -cmp;
    });
  }

  return rows;
});

const slots: any = useSlots();

const totalItems = computed(() => filteredData.value.length);
const totalCols = computed(() => props.columns.length + 1 + (slots.actions ? 1 : 0));

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredData.value.slice(start, start + itemsPerPage.value);
});

// ── Helpers ──────────────────────────────────────────────────────────
function alignClass(align?: 'left' | 'center' | 'right') {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}
</script>
