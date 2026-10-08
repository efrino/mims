<!-- components/welding/mutation/TableHeader.vue -->
<template>
  <thead ref="theadRef">
    <!-- ── Row 1: Labels ─────────────────────────────────── -->
    <tr>
      <th
        v-for="col in LEFT_COLUMNS"
        :key="col.key"
        rowspan="2"
        class="header-cell sticky-col"
        :class="[`col-${col.key}`, { 'filter-active': isFilterActive(col.key) }]"
        :style="leftThStyle(col)"
      >
        <div class="th-inner" :class="`align-${col.align ?? 'center'}`">
          <button
            v-if="['kind', 'partNo', 'customer', 'machine', 'desc'].includes(col.key)"
            class="filter-btn"
            :class="{ 'filter-btn--active': isFilterActive(col.key) }"
            :title="isFilterActive(col.key) ? 'Filter aktif — klik untuk ubah' : 'Filter'"
            @click.stop="(e) => handleOpenFilter(colKeyToFilterField(col.key), e)"
          >
            <i :class="isFilterActive(col.key) ? 'mdi mdi-filter' : 'mdi mdi-filter-outline'" />
          </button>
          <span class="th-label">{{ col.label }}</span>
        </div>
        <div
          class="resize-handle"
          @mousedown.stop="startResize($event, 'left', col.key)"
          @dblclick.stop="resetLeftWidth(col.key)"
          title="Drag to resize · Double-click to auto"
        />
      </th>

      <th
        v-for="day in maxDays"
        :key="`day-${day}`"
        colspan="2"
        class="header-cell date-header"
        :data-day="day"
        :class="{
          'day-today': isToday(day) && isDayVisible(day),
          'day-weekend': isWeekend(day) && isDayVisible(day),
          'day-holiday': isHoliday(day) && isDayVisible(day),
          'day-collapsed': !isDayVisible(day),
          'day-past': isDayVisible(day) && activeShift.isPastDay(day, currentYear!, currentMonth!),
        }"
        :style="dateThStyle(day)"
        :title="!isDayVisible(day) ? `Tgl ${day} — klik untuk tampilkan` : (isHoliday(day) ? `Tgl ${day} — LIBUR NASIONAL: ${holidayNote(day)}` : `Tgl ${day} — klik kanan untuk opsi`)"
        @contextmenu.prevent="isDayVisible(day) ? openDayMenu($event, day) : null"
        @click="!isDayVisible(day) && toggleDay(day)"
      >
        <template v-if="isDayVisible(day)">
          <div class="th-inner align-center date-inner">
            <span class="th-label day-num" :class="{ 'today-pill': isToday(day) }">{{ day }}</span>
            <i v-if="isHoliday(day)" class="mdi mdi-flag holiday-flag" />
          </div>
          <div
            class="resize-handle"
            @mousedown.stop="startResize($event, 'date', day)"
            @dblclick.stop="resetDateWidth(day)"
            title="Drag to resize · Double-click to auto"
          />
        </template>
        <template v-else>
          <div class="collapsed-inner">
            <span class="collapsed-label">{{ day }}</span>
          </div>
        </template>
      </th>

      <th rowspan="2" class="header-cell sticky-right total-header">
        <div class="th-inner align-center">
          <span class="th-label">TOTAL</span>
        </div>
      </th>
    </tr>

    <!-- ── Row 2: D / N sub-headers ──────────────────────── -->
    <tr>
      <template v-for="day in maxDays" :key="`dn-${day}`">
        <template v-if="isDayVisible(day)">
          <th class="header-cell shift-header day-shift" :class="{ 'shift-active': isActiveShift(day, 'day') }" :style="subThStyle(day)" :title="isActiveShift(day, 'day') ? 'Shift aktif sekarang (Day 07:15–19:59)' : undefined">
            <span>D</span>
          </th>
          <th class="header-cell shift-header night-shift" :class="{ 'shift-active': isActiveShift(day, 'night') }" :style="subThStyle(day)" :title="isActiveShift(day, 'night') ? 'Shift aktif sekarang (Night 20:00–07:14)' : undefined">
            <span>N</span>
          </th>
        </template>
        <template v-else>
          <th colspan="2" class="header-cell day-collapsed-sub" :style="dateThStyle(day)" />
        </template>
      </template>
    </tr>
  </thead>

  <!-- ── Filter Dropdown ──────────────────────────────────── -->
  <FilterDropdown
    :show="showFilter"
    :title="filterTitle"
    :position="filterStyle"
    :options="visibleOptions"
    :total-options="filterOptions.length"
    :all-selected="allSelected"
    :some-selected="someSelected"
    :searchable="isSearchable"
    :search-query="filterSearch"
    :active-count="activeCount"
    :merge-existing="filterMerge"
    @close="closeFilter"
    @apply="applyFilter"
    @reset="resetFilter"
    @toggle-all="toggleAll"
    @toggle-option="handleToggleOption"
    @search="setSearch"
    @invert="invertSelection"
    @toggle-merge="(v) => (filterMerge = v)"
  />

  <!-- ── Context menu ──────────────────────────────────────── -->
  <Teleport to="body">
    <div
      v-if="ctxMenu.visible"
      class="ctx-menu"
      :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
      @mouseleave="ctxMenu.visible = false"
    >
      <div class="ctx-item" @click="toggleDay(ctxMenu.day); ctxMenu.visible = false">
        <i class="mdi mdi-eye-off-outline" /> Sembunyikan Tgl {{ ctxMenu.day }}
      </div>
      <div class="ctx-item" @click="resetDateWidth(ctxMenu.day); ctxMenu.visible = false">
        <i class="mdi mdi-arrow-expand-horizontal" /> Reset lebar kolom
      </div>
      <div class="ctx-divider" />
      <div class="ctx-item" @click="showAllDays(); ctxMenu.visible = false">
        <i class="mdi mdi-eye-outline" /> Tampilkan semua tanggal
      </div>
      <div class="ctx-item" @click="hideAllDays(); ctxMenu.visible = false">
        <i class="mdi mdi-eye-off-outline" /> Sembunyikan semua tanggal
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useActiveShift } from '@/composables/useActiveShift'
import { useTableColumns, LEFT_COLUMNS } from '@/composables/useTableColumns'
import { useTableFilter } from '@/composables/useTableFilter'
import FilterDropdown from '@/components/welding/mutation/FilterDropdown.vue'
import type { FilterField, FilterItem } from '@/types/Public/Welding/planning'

interface Props {
  maxDays?: number
  currentYear?: number
  currentMonth?: number
  holidays?: Record<string | number, string>
}

const props = withDefaults(defineProps<Props>(), {
  maxDays: 28,
  currentYear: () => new Date().getFullYear(),
  currentMonth: () => new Date().getMonth() + 1,
  holidays: () => ({}),
})

function isHoliday(day: number): boolean {
  return !!props.holidays && props.holidays[day] != null
}
function holidayNote(day: number): string {
  return (props.holidays && props.holidays[day]) || ''
}

const emit = defineEmits<{
  openFilter: [field: FilterField, event: MouseEvent]
}>()

// ── Column composable ─────────────────────────────────────────────
const {
  leftWidths,
  dateWidths,
  stickyOffsets,
  isDayVisible,
  toggleDay,
  showAllDays,
  setLeftWidth,
  resetLeftWidth,
  setDateWidth,
  resetDateWidth,
} = useTableColumns(props.maxDays)

// ── Filter composable (singleton) ─────────────────────────────────
const {
  showFilter,
  filterField,
  filterTitle,
  filterStyle,
  filterOptions,
  filterSearch,
  filterMerge,
  filters,
  allSelected,
  someSelected,
  isSearchable,
  visibleOptions,
  openFilter,
  closeFilter,
  toggleAll,
  invertSelection,
  setSearch,
  applyFilter,
  resetFilter,
  activeCount,
} = useTableFilter()

// ── Filter helpers ────────────────────────────────────────────────
function colKeyToFilterField(key: string): FilterField {
  // kolom CUSTOMER/MODEL memakai filter MODEL (customer bisa >1 per part, tak difilter)
  if (key === 'customer') return 'model'
  return (key === 'desc' ? 'description' : key) as FilterField
}

function isFilterActive(key: string): boolean {
  const field = colKeyToFilterField(key)
  if (!(field in filters.value)) return false
  return (filters.value as any)[field].length > 0
}

function handleOpenFilter(field: FilterField, e: MouseEvent) {
  openFilter(field, e)
  emit('openFilter', field, e)
}

function handleToggleOption(item: FilterItem) {
  item.selected = !item.selected
}

// ── Context menu ──────────────────────────────────────────────────
const theadRef = ref<HTMLElement | null>(null)
const ctxMenu = ref({ visible: false, x: 0, y: 0, day: 0 })
const hiddenCount = ref(0)

function openDayMenu(e: MouseEvent, day: number) {
  ctxMenu.value = { visible: true, x: e.clientX, y: e.clientY, day }
}

function hideAllDays() {
  for (let d = 1; d <= props.maxDays; d++) {
    if (isDayVisible(d)) toggleDay(d)
  }
}

// ── Shift aktif sekarang (pill D/N) ───────────────────────────────
const activeShift = useActiveShift()
const isActiveShift = (day: number, shift: 'day' | 'night') =>
  activeShift.isActiveShift(day, shift, props.currentYear!, props.currentMonth!)

// ── Today / Weekend ───────────────────────────────────────────────
function isToday(day: number): boolean {
  const now = new Date()
  return (
    now.getFullYear() === props.currentYear &&
    now.getMonth() + 1 === props.currentMonth &&
    now.getDate() === day
  )
}

function isWeekend(day: number): boolean {
  const d = new Date(props.currentYear!, props.currentMonth! - 1, day)
  return d.getDay() === 0 || d.getDay() === 6
}

// ── Style helpers ─────────────────────────────────────────────────
function leftThStyle(col: typeof LEFT_COLUMNS[0]) {
  const w = leftWidths.value[col.key] ?? col.defaultWidth
  const lf = stickyOffsets.value[col.key] ?? 0
  return { width: `${w}px`, minWidth: `${col.minWidth}px`, maxWidth: `${w}px`, left: `${lf}px` }
}

function dateThStyle(day: number) {
  const w = isDayVisible(day) ? (dateWidths.value[day] ?? 46) * 2 : 18
  return { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`, padding: '0' }
}

function subThStyle(day: number) {
  const w = isDayVisible(day) ? (dateWidths.value[day] ?? 46) : 9
  return { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }
}

// ── Resize ────────────────────────────────────────────────────────
const resizing = ref<{
  type: 'left' | 'date'
  key: string | number
  startX: number
  startW: number
} | null>(null)

function startResize(e: MouseEvent, type: 'left' | 'date', key: string | number) {
  e.preventDefault()
  const startW =
    type === 'left'
      ? (leftWidths.value[key as string] ?? 50)
      : (dateWidths.value[key as number] ?? 46)
  resizing.value = { type, key, startX: e.clientX, startW }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResize(e: MouseEvent) {
  if (!resizing.value) return
  const { type, key, startX, startW } = resizing.value
  const delta = e.clientX - startX
  type === 'left'
    ? setLeftWidth(key as string, startW + delta)
    : setDateWidth(key as number, startW + Math.round(delta / 2))
}

function stopResize() {
  resizing.value = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

let row1Observer: ResizeObserver | undefined

function onDocClick() {
  ctxMenu.value.visible = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)

  // `top` baris-2 = tinggi baris-1 (sel tanggal). Diukur ulang lewat ResizeObserver:
  // ukuran awal saat mount bisa beda dari akhir (font/data belum siap) → celah.
  // CSS var (bukan style per-th) supaya sel baris-2 yang dibuat belakangan ikut.
  const dateTh = theadRef.value?.querySelector('tr:first-child th.date-header') as HTMLElement | null
  if (theadRef.value && dateTh) {
    const sync = () => theadRef.value?.style.setProperty('--row2-top', `${Math.floor(dateTh.getBoundingClientRect().height)}px`)
    sync()
    row1Observer = new ResizeObserver(sync)
    row1Observer.observe(dateTh)
  }
})
onUnmounted(() => {
  row1Observer?.disconnect()
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
/* ── Base header cell ────────────────────────────────────── */
.header-cell {
  background: linear-gradient(180deg, #3b5998 0%, #2d4373 100%);
  color: #fff;
  font-weight: 600;
  font-size: 11px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
  box-sizing: border-box;
  overflow: hidden;
  transition: filter 0.15s;
}

/* ── Inner wrapper ───────────────────────────────────────── */
.th-inner {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  height: 100%;
  min-height: 36px;
  box-sizing: border-box;
  overflow: hidden;
}

.align-center {
  justify-content: center;
  text-align: center;
}

.align-left {
  justify-content: flex-start;
  text-align: left;
}

.align-right {
  justify-content: flex-end;
  text-align: right;
}

.th-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  line-height: 1.25;
  text-align: inherit;
  flex: 1;
}

thead tr:nth-child(2) th { top: var(--row2-top, 0px); }

/* ── Sticky columns ──────────────────────────────────────── */
.sticky-col {
  position: sticky !important;
  background: linear-gradient(180deg, #3b5998 0%, #2d4373 100%) !important;
  z-index: 100 !important;
}

.sticky-col.filter-active {
  border-bottom: 3px solid #f59e0b !important;
}

.col-desc {
  border-right: 2px solid rgba(0, 0, 0, 0.3) !important;
  box-shadow: 3px 0 8px rgba(0, 0, 0, 0.15);
}

.sticky-right {
  position: sticky;
  right: 0;
  border-left: 2px solid rgba(0, 0, 0, 0.3) !important;
  box-shadow: -3px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 100 !important;
  background: linear-gradient(180deg, #3b5998 0%, #2d4373 100%) !important;
  min-width: 80px;
}

/* ── Date headers ────────────────────────────────────────── */
.date-header {
  font-size: 11px;
}

.date-header:not(.day-collapsed):hover {
  filter: brightness(1.12);
}

.date-inner {
  position: relative;
  justify-content: center;
}

.day-num {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.3px;
}

/* ── Weekend ─────────────────────────────────────────────── */
.day-weekend {
  background: linear-gradient(180deg, #c0392b 0%, #96281b 100%) !important;
}

/* ── Libur nasional ──────────────────────────────────────── */
.day-holiday {
  background: linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%) !important;
  box-shadow: inset 0 4px 0 0 #fbbf24 !important;
}

.day-holiday.day-weekend {
  background: linear-gradient(180deg, #6d28d9 0%, #4c1d95 100%) !important;
}

.holiday-flag {
  font-size: 9px;
  color: #fbbf24;
  margin-left: 2px;
  flex: none;
}

/* ── Today ────────────────────────────────────────────────── */
.day-today {
  background: linear-gradient(180deg, #1e3a8a 0%, #172554 100%) !important;
  box-shadow: inset 0 4px 0 0 #f59e0b !important;
}

.day-today.day-weekend {
  background: linear-gradient(180deg, #8b1a1a 0%, #6b1212 100%) !important;
  box-shadow: inset 0 4px 0 0 #fcd34d !important;
}

.today-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  background: #f59e0b;
  color: var(--dm-text, #1a1a1a);
  border-radius: 10px;
  font-weight: 900;
  font-size: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  flex: none;
  line-height: 1;
}


/* Tanggal sudah lewat: header diredupkan (data beku). */
.date-header.day-past { filter: saturate(.55) brightness(.92); }
.date-header.day-past .day-num { opacity: .8; }

/* Shift yang sedang berjalan: huruf D/N jadi pill berwarna kebalikan shiftnya
   (D aktif = pill ungu di atas kuning, N aktif = pill kuning di atas ungu). */
.shift-active span {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
  font-weight: 900; font-size: 10px; line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}
.day-shift.shift-active span { background: #553a6e; color: #f0e6f6; }
.night-shift.shift-active span { background: #e8a817; color: var(--dm-on-amber, #3d2e00); }

/* ── Shift headers (D/N) ─────────────────────────────────── */
.shift-header {
  font-weight: 700;
  font-size: 10px;
  padding: 4px 2px;
  box-sizing: border-box;
  letter-spacing: 0.3px;
}

.day-shift {
  background: linear-gradient(180deg, #e8a817 0%, #c78c14 100%) !important;
  color: var(--dm-on-amber, #3d2e00);
}

.night-shift {
  background: linear-gradient(180deg, #6d4c8a 0%, #553a6e 100%) !important;
  color: #f0e6f6;
}

/* ── Collapsed day ───────────────────────────────────────── */
.day-collapsed {
  background: linear-gradient(180deg, #1e3050 0%, #162238 100%) !important;
  cursor: pointer !important;
  border-color: rgba(255, 255, 255, 0.04) !important;
  transition: background 0.15s, filter 0.15s;
}

.day-collapsed:hover {
  background: linear-gradient(180deg, #2d4373 0%, #1e3050 100%) !important;
  filter: brightness(1.2);
}

.collapsed-inner {
  flex-direction: column;
  gap: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 36px;
  padding: 4px 0;
}

.collapsed-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.5px;
  line-height: 1;
}

.day-collapsed-sub {
  background: linear-gradient(180deg, #162238 0%, #101a2c 100%) !important;
  border-color: rgba(255, 255, 255, 0.02) !important;
  padding: 0 !important;
}

/* ── Resize handle ───────────────────────────────────────── */
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  z-index: 10;
  transition: background 0.15s;
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 1px;
  top: 25%;
  bottom: 25%;
  width: 2px;
  border-radius: 1px;
  background: transparent;
  transition: background 0.15s;
}

.resize-handle:hover::after {
  background: rgba(255, 255, 255, 0.4);
}

/* ── Filter button ───────────────────────────────────────── */
.filter-btn {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.18);
}

.filter-btn--active {
  background: #f59e0b !important;
  border-color: #d97706 !important;
  color: var(--dm-text, #1a1a1a) !important;
}

.filter-btn--active:hover {
  background: #fbbf24 !important;
  border-color: #f59e0b !important;
}
</style>

<style>
/* ── Context menu (global, not scoped) ───────────────────── */
.ctx-menu {
  position: fixed;
  z-index: 999999 !important;
  background: var(--dm-surface, white);
  border: 1px solid var(--dm-border, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  min-width: 220px;
  overflow: hidden;
  font-size: 13px;
  animation: ctx-fade-in 0.12s ease;
}

@keyframes ctx-fade-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.ctx-item {
  padding: 9px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--dm-cell, #374151);
  transition: background 0.1s;
  font-size: 12.5px;
}

.ctx-item:hover {
  background: var(--dm-tint-blue, #eff6ff);
  color: var(--dm-accent, #1e40af);
}

.ctx-item .mdi {
  font-size: 15px;
  color: var(--dm-muted, #6b7280);
  width: 18px;
  text-align: center;
}

.ctx-item:hover .mdi {
  color: #3b82f6;
}

.ctx-divider {
  height: 1px;
  background: var(--dm-bg, #f3f4f6);
  margin: 4px 0;
}
</style>
