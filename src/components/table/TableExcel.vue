<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
      <div class="flex-1" />

      <!-- Slot for extra header actions (export button, etc.) -->
      <slot name="header-actions" />
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left border-collapse">
        <thead>
          <!-- Column header row -->
          <tr class="border-b border-gray-200 dark:border-gray-700" :class="props.theadClass">
            <th
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 whitespace-nowrap w-12 text-center"
            >
              No
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 whitespace-nowrap"
              :class="[alignClass(col.align)]"
              :style="col.width ? { width: col.width } : {}"
            >
              <span class="inline-flex items-center gap-1">
                <!-- Kepala kolom bisa diganti isinya, mis. checkbox pilih-semua.
                     Tombol filter di bawah sengaja di luar slot supaya kolom yang
                     ditimpa pun tetap bisa disaring. -->
                <slot :name="`header-${col.key}`" :column="col">
                  <span>
                    {{ col.label }}
                    <i v-if="sortKey === col.key" class="mdi text-blue-500" :class="sortDir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'" />
                  </span>
                </slot>

                <!-- Excel-style per-column filter icon — satu-satunya cara sort & filter dari thead sekarang, ascending/descending dipindah ke dalam menu filter -->
                <button
                  v-if="col.filterable !== false"
                  type="button"
                  @click.stop="toggleFilter(col.key, $event)"
                  class="rounded p-0.5 hover:bg-sky-200 dark:hover:bg-sky-800/40"
                  :class="isColumnFiltered(col.key) ? 'text-blue-600' : 'text-gray-400'"
                >
                  <i class="mdi mdi-filter-variant text-sm" />
                </button>
              </span>
            </th>
            <th
              v-if="$slots.actions"
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 text-center whitespace-nowrap"
            >
              Aksi
            </th>
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
            :class="[...rowClasses(rIdx), hasRowClickListener ? 'cursor-pointer' : '']"
            @click="hasRowClickListener && emit('row-click', row)"
          >
            <td class="px-4 py-2.5 text-center text-gray-400 text-xs font-medium">
              {{ (currentPage - 1) * itemsPerPage + rIdx + 1 }}
            </td>
            <template v-for="col in columns" :key="col.key">
              <td
                v-if="col.key !== rowSpanKey || rowSpanCounts[rIdx] !== 0"
                :rowspan="col.key === rowSpanKey ? rowSpanCounts[rIdx] : undefined"
                class="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs"
                :class="alignClass(col.align)"
              >
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="(currentPage - 1) * itemsPerPage + rIdx">
                  {{ row[col.key] ?? '-' }}
                </slot>
              </td>
            </template>
            <td v-if="$slots.actions" class="px-4 py-2.5 text-center">
              <slot name="actions" :row="row" :index="(currentPage - 1) * itemsPerPage + rIdx" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="border-t border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden">
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
      >
        <template #info-extra>
          <button
            v-if="isAnyFilterActive"
            type="button"
            @click="clearAllFilters"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
          >
            <i class="mdi mdi-filter-off text-xs" />
            Clear Filter
          </button>
        </template>
      </Pagination>
    </div>
  </div>

  <!-- Excel-style filter popover: teleported to <body> so it's never clipped by the table's scroll container -->
  <Teleport to="body">
    <div
      v-if="activeFilterCol"
      ref="popoverEl"
      class="excel-filter-popover fixed z-[9999] w-56 max-h-[calc(100vh-32px)] flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2 text-xs font-normal"
      :style="{ top: popoverPos.top + 'px', left: popoverPos.left + 'px' }"
      @click.stop
    >
      <!-- Sort: sama seperti thead, hanya dipindah juga ke sini supaya bisa langsung diakses dari menu filter -->
      <div v-if="isColumnSortable(activeFilterCol)" class="mb-2 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
        <button
          type="button"
          @click="setSort(activeFilterCol, 'asc')"
          class="flex items-center gap-1.5 w-full px-1 py-1 rounded text-left hover:bg-gray-50 dark:hover:bg-gray-700"
          :class="sortKey === activeFilterCol && sortDir === 'asc' ? 'text-blue-600 font-medium' : 'text-gray-600 dark:text-gray-300'"
        >
          <i class="mdi mdi-sort-ascending text-sm" />
          Sort A to Z / Ascending
        </button>
        <button
          type="button"
          @click="setSort(activeFilterCol, 'desc')"
          class="flex items-center gap-1.5 w-full px-1 py-1 rounded text-left hover:bg-gray-50 dark:hover:bg-gray-700"
          :class="sortKey === activeFilterCol && sortDir === 'desc' ? 'text-blue-600 font-medium' : 'text-gray-600 dark:text-gray-300'"
        >
          <i class="mdi mdi-sort-descending text-sm" />
          Sort Z to A / Descending
        </button>
      </div>

      <!-- Search: narrows the checklist below -->
      <div class="relative mb-2 shrink-0">
        <i class="mdi mdi-magnify absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
        <input
          ref="checklistSearchInputEl"
          v-model="checklistSearch[activeFilterCol]"
          type="text"
          placeholder="Cari nilai..."
          class="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <!-- Quick actions: select all / clear filter / invert (semua beroperasi pada nilai yang sedang tampil, hasil cascading dari filter kolom lain + pencarian) -->
      <div class="flex items-center justify-between px-1.5 py-1 rounded-t-lg border border-gray-200 dark:border-gray-700 shrink-0">
        <button type="button" @click="selectAllColumn(activeFilterCol)" class="text-[11px] text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:underline">
          Select All
        </button>
        <button type="button" @click="clearColumnFilter(activeFilterCol)" class="text-[11px] text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:underline">
          Clear Filter
        </button>
        <button type="button" @click="invertColumnSelection(activeFilterCol)" class="text-[11px] text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:underline">
          Invert
        </button>
      </div>

      <!-- Value checklist: hanya menampilkan nilai yang masih mungkin muncul setelah filter kolom lain diterapkan -->
      <div class="max-h-40 min-h-[40px] overflow-y-auto overscroll-contain p-1 space-y-0.5 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700 flex-1">
        <label
          v-for="val in visibleValues(activeFilterCol)"
          :key="val"
          class="flex items-center gap-2 px-1 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="isValueSelected(activeFilterCol, val)"
            @change="toggleValue(activeFilterCol, val)"
            class="rounded border-2 border-gray-400 dark:border-gray-500 text-blue-600 focus:ring-blue-400"
          />
          <span class="truncate">{{ val || '(kosong)' }}</span>
        </label>
        <div v-if="visibleValues(activeFilterCol).length === 0" class="px-1 py-2 text-xs text-gray-400 text-center">
          Tidak ada nilai cocok
        </div>
      </div>

      <div class="flex items-center justify-end mt-2 px-1.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
        <button type="button" @click="activeFilterCol = null" class="text-xs font-medium text-blue-600 hover:text-blue-700">
          Tutup
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, useSlots, getCurrentInstance, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Pagination from '@/components/table/Pagination.vue';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean; // default: true
  filterable?: boolean; // show excel-style filter icon, default: true
  align?: 'left' | 'center' | 'right';
  width?: string; // fixed column width e.g. '120px'
}

interface Props {
  columns: TableColumn[];
  data: Record<string, unknown>[];
  loading?: boolean;
  perPageOptions?: number[];
  initialItemsPerPage?: number;
  // Column key whose consecutive equal values get merged into a single cell via rowspan.
  // Only makes visual sense while rows for that key stay adjacent (e.g. no sort/filter split them apart).
  rowSpanKey?: string;
  // Classes applied to the <thead> row, e.g. for a colored header background.
  theadClass?: string;
  // How groups formed by `rowSpanKey` are visually told apart: alternating background ('stripe'),
  // a divider line between groups ('divider'), both, or plain rows ('none'). Ignored without rowSpanKey.
  groupVisual?: 'none' | 'stripe' | 'divider' | 'both';
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  perPageOptions: () => [10, 25, 50, 100],
  initialItemsPerPage: 10,
  rowSpanKey: undefined,
  theadClass: 'bg-transparent',
  groupVisual: 'divider'
});

// Opsional: dipakai halaman yg butuh baris bisa diklik (mis. buka modal detail).
// Kalau tidak di-listen, tidak ada efek apa pun ke pemakai existing.
//
// Catatan: `useAttrs()` TIDAK bisa dipakai utk deteksi ini - event yg sudah dideklarasikan
// lewat defineEmits otomatis "dikonsumsi" & DIKELUARKAN dari $attrs oleh Vue, jadi
// attrs.onRowClick akan selalu undefined walau listener terpasang. Makanya deteksinya
// lewat vnode.props instance saat ini, bukan attrs.
const emit = defineEmits<{ 'row-click': [row: Record<string, unknown>] }>();
const instance = getCurrentInstance();
const hasRowClickListener = computed(() => !!instance?.vnode.props?.onRowClick);

// ── Excel-style per-column filter (search narrows checklist, checkboxes drive the filter) ──
const activeFilterCol = ref<string | null>(null);
const popoverEl = ref<HTMLElement | null>(null);
const checklistSearchInputEl = ref<HTMLInputElement | null>(null);
const checklistSearch = reactive<Record<string, string>>(Object.fromEntries(props.columns.map((c) => [c.key, ''])));
// null = tidak difilter (semua tampil). Set = hanya nilai di dalamnya yang tampil.
const selectedValues = reactive<Record<string, Set<string> | null>>(Object.fromEntries(props.columns.map((c) => [c.key, null])));

// Columns bisa bertambah secara dinamis (mis. kolom tanggal setelah data async selesai).
// Pastikan setiap key baru punya entry agar cascadedValuesByColumn tidak membaca undefined
// dan memanggil .has() pada bukan-Set (undefined !== null → throws).
watch(
  () => props.columns.map((c) => c.key).join(','),
  (keys) => {
    for (const key of keys.split(',').filter(Boolean)) {
      if (!(key in checklistSearch)) checklistSearch[key] = '';
      if (!(key in selectedValues)) selectedValues[key] = null;
    }
  },
  { immediate: true }
);

// Nilai unik per kolom dengan "not-self cascading": diambil dari data yang sudah
// disaring oleh filter kolom LAIN (bukan filter kolom itu sendiri), supaya opsi checklist
// pada satu kolom mengikuti hasil filter kolom-kolom lain yang sudah dipilih.
const cascadedValuesByColumn = computed<Record<string, string[]>>(() => {
  const result: Record<string, string[]> = {};
  for (const col of props.columns) {
    let rows = props.data;
    for (const otherCol of props.columns) {
      if (otherCol.key === col.key) continue;
      const sel = selectedValues[otherCol.key];
      if (sel !== null) {
        rows = rows.filter((row) => sel.has(String(row[otherCol.key] ?? '')));
      }
    }
    const values = new Set<string>();
    for (const row of rows) {
      values.add(String(row[col.key] ?? ''));
    }
    result[col.key] = Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }
  return result;
});

function visibleValues(key: string): string[] {
  const q = (checklistSearch[key] ?? '').trim().toLowerCase();
  const all = cascadedValuesByColumn.value[key] ?? [];
  if (!q) return all;
  return all.filter((v) => v.toLowerCase().includes(q));
}

function isColumnFiltered(key: string): boolean {
  return selectedValues[key] !== null;
}

// Default: tidak ada satu pun yang tercentang (null = belum difilter, tampilkan semua baris).
// Checkbox baru tercentang setelah user benar-benar memilih nilai untuk difilter —
// bukan seolah-olah "semua terpilih" di awal.
function isValueSelected(key: string, val: string): boolean {
  const sel = selectedValues[key];
  return sel === null ? false : sel.has(val);
}

function isAllSelected(key: string): boolean {
  const sel = selectedValues[key];
  if (sel === null) return false;
  return sel.size > 0 && sel.size === (cascadedValuesByColumn.value[key]?.length ?? 0);
}

function isIndeterminate(key: string): boolean {
  const sel = selectedValues[key];
  if (sel === null) return false;
  return sel.size > 0 && sel.size < (cascadedValuesByColumn.value[key]?.length ?? 0);
}

function toggleValue(key: string, val: string) {
  // Mulai dari kosong (bukan "semua"), karena default sekarang adalah tidak tercentang.
  const current = selectedValues[key] === null ? new Set<string>() : new Set(selectedValues[key]);

  if (current.has(val)) {
    current.delete(val);
  } else {
    current.add(val);
  }

  // Kalau tidak ada lagi yang tercentang, kembalikan ke null (state "tidak difilter")
  selectedValues[key] = current.size === 0 ? null : current;
}

// Centang semua nilai yang sedang tampil (hasil cascading + pencarian kolom ini)
function selectAllColumn(key: string) {
  const visible = visibleValues(key);
  selectedValues[key] = visible.length === 0 ? null : new Set(visible);
}

// Balikkan pilihan: nilai yang tadinya tercentang jadi tidak, dan sebaliknya (dalam lingkup nilai yang sedang tampil)
function invertColumnSelection(key: string) {
  const visible = visibleValues(key);
  const inverted = visible.filter((v) => !isValueSelected(key, v));
  selectedValues[key] = inverted.length === 0 ? null : new Set(inverted);
}

function clearColumnFilter(key: string) {
  selectedValues[key] = null;
  checklistSearch[key] = '';
}

// Apakah ada filter kolom manapun yang sedang aktif (dipakai untuk tombol "Clear Filter" global)
const isAnyFilterActive = computed(() => props.columns.some((col) => selectedValues[col.key] !== null));

function clearAllFilters() {
  for (const col of props.columns) {
    selectedValues[col.key] = null;
    checklistSearch[col.key] = '';
  }
}

// Popover di-teleport ke <body> (fixed position) supaya tidak pernah terpotong
// oleh container scroll tabel — posisinya dihitung dari tombol filter yang diklik.
const popoverPos = ref({ top: 0, left: 0 });
const POPOVER_WIDTH = 224; // w-56
const POPOVER_HEIGHT_ESTIMATE = 320;

function toggleFilter(key: string, e?: MouseEvent) {
  if (activeFilterCol.value === key) {
    activeFilterCol.value = null;
    return;
  }

  activeFilterCol.value = key;

  const btnEl = e?.currentTarget as HTMLElement | undefined;

  if (btnEl) {
    const btn = btnEl.getBoundingClientRect();
    let left = btn.left;
    // Jaga agar popover tidak keluar dari tepi kanan viewport
    if (left + POPOVER_WIDTH > window.innerWidth) {
      left = window.innerWidth - POPOVER_WIDTH - 8;
    }
    left = Math.max(8, left);

    const spaceBelow = window.innerHeight - btn.bottom;
    const spaceAbove = btn.top;

    let top = btn.bottom + 4;
    // Jika di bawah tidak cukup ruang dan di atas lebih lega, buka ke arah atas
    if (spaceBelow < POPOVER_HEIGHT_ESTIMATE && spaceAbove > spaceBelow) {
      top = Math.max(8, btn.top - POPOVER_HEIGHT_ESTIMATE - 4);
    } else if (top + POPOVER_HEIGHT_ESTIMATE > window.innerHeight) {
      top = Math.max(8, window.innerHeight - POPOVER_HEIGHT_ESTIMATE - 8);
    }

    popoverPos.value = { top, left };
  }

  // Hitung ulang posisi setelah popover ter-render menggunakan tinggi aktual elemennya
  nextTick(() => {
    if (popoverEl.value && btnEl) {
      const btn = btnEl.getBoundingClientRect();
      const popoverRect = popoverEl.value.getBoundingClientRect();
      const popoverHeight = popoverRect.height;
      const spaceBelow = window.innerHeight - btn.bottom;
      const spaceAbove = btn.top;

      let top = btn.bottom + 4;
      if (spaceBelow < popoverHeight && spaceAbove >= popoverHeight) {
        // Popover dibuka ke atas jika tidak muat di bawah
        top = Math.max(8, btn.top - popoverHeight - 4);
      } else if (top + popoverHeight > window.innerHeight) {
        // Geser ke atas agar tidak terpotong bagian bawah layar
        top = Math.max(8, window.innerHeight - popoverHeight - 8);
      }

      popoverPos.value = {
        top,
        left: popoverPos.value.left
      };
    }
    checklistSearchInputEl.value?.focus();
  });
}

function handleClickOutsideFilter(e: MouseEvent) {
  if (!activeFilterCol.value) return;
  const target = e.target as HTMLElement;
  if (!target.closest('.excel-filter-popover') && !target.closest('.mdi-filter-variant')) {
    activeFilterCol.value = null;
  }
}

// Tutup popover kalau ada scroll di manapun (termasuk di dalam container tabel),
// supaya tidak "menempel di tempat lama" saat posisi tombol berubah.
function handleScrollClose(e: Event) {
  if (!activeFilterCol.value) return;
  const target = e.target as HTMLElement | Document;
  if (target instanceof HTMLElement && target.closest('.excel-filter-popover')) return;
  activeFilterCol.value = null;
}

onMounted(() => {
  document.addEventListener('click', handleClickOutsideFilter);
  window.addEventListener('scroll', handleScrollClose, true);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutsideFilter);
  window.removeEventListener('scroll', handleScrollClose, true);
});

// ── Sort ────────────────────────────────────────────────────────────
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

// Sort langsung ke arah tertentu — dipakai oleh opsi "Sort A to Z / Z to A" di dalam menu filter
// (satu-satunya cara sorting sekarang; thead cuma menampilkan indikator arah, tidak bisa diklik).
// Klik lagi pada arah yang sedang aktif = hapus sort itu (kembali ke urutan data asli).
function setSort(key: string, dir: 'asc' | 'desc') {
  if (sortKey.value === key && sortDir.value === dir) {
    sortKey.value = null;
  } else {
    sortKey.value = key;
    sortDir.value = dir;
  }
  currentPage.value = 1;
}

function isColumnSortable(key: string): boolean {
  const col = props.columns.find((c) => c.key === key);
  return col?.sortable !== false;
}

// ── Pagination ───────────────────────────────────────────────────────
const currentPage = ref(1);
const itemsPerPage = ref(props.initialItemsPerPage);

watch([sortKey, sortDir, itemsPerPage], () => {
  currentPage.value = 1;
});
watch(
  selectedValues,
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

// ── Filtered + sorted data ───────────────────────────────────────────
const filteredData = computed(() => {
  let rows = [...props.data];

  for (const col of props.columns) {
    const sel = selectedValues[col.key] ?? null;
    if (sel !== null) {
      rows = rows.filter((row) => sel.has(String(row[col.key] ?? '')));
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

// Baris yang sedang tampil -- sesudah filter checklist tiap kolom dan sort, sebelum
// dipotong paginasi. Dibuka lewat template ref untuk halaman yang perlu mengekspor
// "apa yang terlihat di layar"; state filter itu sendiri tetap hanya milik tabel.
// `filteredData` (computed) dipakai CombinePallet & ResumePallet untuk export Excel.
// `isAnyFilterActive` dipakai report achievement stamping/welding: download Excel backend
// hanya baris yang lolos filter saat ada filter kolom aktif.
defineExpose({
  getVisibleRows: (): Record<string, unknown>[] => filteredData.value,
  filteredData,
  isAnyFilterActive
});

const totalItems = computed(() => filteredData.value.length);
const totalCols = computed(() => props.columns.length + 1 + (slots.actions ? 1 : 0));

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredData.value.slice(start, start + itemsPerPage.value);
});

// Rowspan count per row for `rowSpanKey`, computed within the current page only:
// the first row of a run of consecutive equal values gets the run length, the rest get 0 (hidden).
const rowSpanCounts = computed<number[]>(() => {
  const key = props.rowSpanKey;
  const rows = pagedData.value;
  const counts = new Array(rows.length).fill(1);
  if (!key) return counts;

  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && rows[j][key] === rows[i][key]) j++;
    counts[i] = j - i;
    for (let k = i + 1; k < j; k++) counts[k] = 0;
    i = j;
  }
  return counts;
});

// Group index per row for `rowSpanKey` (0, 1, 2, ...), used to stripe/divide by group
// instead of by individual row. -1 when rowSpanKey isn't set.
const rowGroupIndexes = computed<number[]>(() => {
  const key = props.rowSpanKey;
  const rows = pagedData.value;
  const indexes = new Array(rows.length).fill(-1);
  if (!key) return indexes;

  let group = 0;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i][key] !== rows[i - 1][key]) group++;
    indexes[i] = group;
  }
  return indexes;
});

function rowClasses(rIdx: number): string[] {
  const classes: string[] = [];
  const useGrouping = !!props.rowSpanKey && props.groupVisual !== 'none';
  const isNewGroup = useGrouping && rIdx > 0 && rowGroupIndexes.value[rIdx] !== rowGroupIndexes.value[rIdx - 1];

  const stripeOn = useGrouping ? rowGroupIndexes.value[rIdx] : rIdx;
  const showStripe = !useGrouping || props.groupVisual === 'stripe' || props.groupVisual === 'both';
  classes.push(showStripe && stripeOn % 2 !== 0 ? 'bg-gray-50 dark:bg-gray-800/30' : 'bg-white dark:bg-transparent');

  if (isNewGroup && (props.groupVisual === 'divider' || props.groupVisual === 'both')) {
    classes.push('border-t-2 border-t-gray-300 dark:border-t-gray-600');
  }

  return classes;
}

// ── Helpers ──────────────────────────────────────────────────────────
function alignClass(align?: 'left' | 'center' | 'right') {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}
</script>

<style scoped>
/* Utilitas .border Vuetify ada di @layer vendor dengan !important (menang atas CSS tanpa layer),
   jadi warna border kotak di popover filter diatur di layer yang sama */
@layer vendor {
  .excel-filter-popover.border,
  .excel-filter-popover .border {
    border-color: #e5e7eb !important;
  }
}
</style>
