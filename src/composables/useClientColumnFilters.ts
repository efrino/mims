// composables/useClientColumnFilters.ts
// Filter kolom gaya Excel untuk tabel yang datanya sudah lengkap di klien (tanpa server):
// dropdown per header (cari, centang, invert, "tambahkan ke filter yang ada"), opsi tiap
// kolom ikut menyempit oleh filter kolom lain (cascade). Perilaku sama dengan
// useMasterColumnFilters; tampilan pakai components/welding/mutation/FilterDropdown.vue.
import { computed, ref, type Ref } from 'vue'

export interface FilterItem { value: string; label: string; selected: boolean }

export interface ClientFilterColumn<T> {
  title: string
  /** Nilai sel; array = baris lolos bila salah satu nilainya terpilih (mis. daftar part). */
  get: (row: T) => string | string[] | null | undefined
}

const EMPTY = '(kosong)'
const valuesOf = <T>(col: ClientFilterColumn<T>, row: T): string[] => {
  const v = col.get(row)
  const list = (Array.isArray(v) ? v : [v]).map(x => (x == null || String(x).trim() === '' ? EMPTY : String(x).trim()))
  return list.length ? list : [EMPTY]
}
const natural = new Intl.Collator('id', { numeric: true, sensitivity: 'base' })

export function useClientColumnFilters<T, K extends string>(rows: Ref<T[]>, columns: Record<K, ClientFilterColumn<T>>) {
  const keys = Object.keys(columns) as K[]
  const filters = ref(Object.fromEntries(keys.map(k => [k, [] as string[]])) as Record<K, string[]>) as Ref<Record<K, string[]>>

  const showFilter = ref(false)
  const filterField = ref(keys[0]) as Ref<K>
  const filterStyle = ref({ top: '0px', left: '0px' })
  const filterOptions = ref<FilterItem[]>([])
  const filterSearch = ref('')
  const filterMerge = ref(false)
  const filterTitle = computed(() => `Filter ${columns[filterField.value].title.toUpperCase()}`)

  const passes = (row: T, except?: K) => keys.every(k => {
    if (k === except || !filters.value[k].length) return true
    const sel = new Set(filters.value[k])
    return valuesOf(columns[k], row).some(v => sel.has(v))
  })
  const filtered = computed(() => rows.value.filter(r => passes(r)))

  const visibleOptions = computed(() => {
    const q = filterSearch.value.trim()
    if (!q) return filterOptions.value
    // Longgar: tiap kata harus ada, tanda pisah/spasi/titik diabaikan (sama dgn Master Data).
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_./]+/g, '')
    const words = q.split(/\s+/).map(norm).filter(Boolean)
    return filterOptions.value.filter(o => { const l = norm(o.label); return words.every(w => l.includes(w)) })
  })
  const allSelected = computed(() => visibleOptions.value.length > 0 && visibleOptions.value.every(o => o.selected))
  const someSelected = computed(() => visibleOptions.value.some(o => o.selected) && !allSelected.value)
  const hasActiveFilters = computed(() => keys.some(k => filters.value[k].length > 0))
  const isFilterActive = (k: K) => filters.value[k].length > 0

  function buildOptions(k: K) {
    const set = new Set<string>()
    for (const r of rows.value) if (passes(r, k)) valuesOf(columns[k], r).forEach(v => set.add(v))
    const active = new Set(filters.value[k])
    const hasMatchingActive = active.size > 0 && [...set].some(v => active.has(v))
    filterOptions.value = [...set].sort(natural.compare).map(value => ({ value, label: value, selected: !hasMatchingActive || active.has(value) }))
  }

  function openFilter(k: K, event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const w = 280, h = 420
    let top = rect.bottom + 6, left = rect.left
    if (left + w > window.innerWidth) left = Math.max(6, rect.right - w)
    if (top + h > window.innerHeight) top = Math.max(6, rect.top - h - 6)
    filterField.value = k
    filterSearch.value = ''
    filterMerge.value = false
    filterStyle.value = { top: `${top}px`, left: `${left}px` }
    buildOptions(k)
    showFilter.value = true
  }
  function closeFilter() { showFilter.value = false; filterSearch.value = '' }

  function handleToggleAll(checked: boolean) {
    const visible = new Set(visibleOptions.value.map(o => o.value))
    filterOptions.value.forEach(o => { if (visible.has(o.value)) o.selected = checked })
  }
  function handleToggleOption(item: FilterItem) {
    // Semua tercentang + klik satu → pilih HANYA item itu (perilaku Excel/Master Data).
    if (filterOptions.value.every(o => o.selected) && item.selected) filterOptions.value.forEach(o => { o.selected = o.value === item.value })
    else item.selected = !item.selected
  }
  function invertSelection() { visibleOptions.value.forEach(o => { o.selected = !o.selected }) }
  function handleSearch(q: string) { filterSearch.value = q }

  function applyFilter() {
    const k = filterField.value
    const searching = !!filterSearch.value.trim()
    const pool = searching ? visibleOptions.value : filterOptions.value
    const selected = pool.filter(o => o.selected).map(o => o.value)
    let next = !searching && selected.length === filterOptions.value.length ? [] : selected
    if (searching && filterMerge.value && filters.value[k].length) next = [...new Set([...filters.value[k], ...selected])]
    filters.value[k] = next
    closeFilter()
  }
  function clearFilter(k?: K) {
    if (k) { filters.value[k] = []; if (showFilter.value && filterField.value === k) buildOptions(k) }
    else keys.forEach(x => { filters.value[x] = [] })
  }

  return {
    filters, filtered, showFilter, filterField, filterTitle, filterStyle, filterOptions, filterSearch, filterMerge,
    visibleOptions, allSelected, someSelected, hasActiveFilters, isFilterActive,
    openFilter, closeFilter, handleToggleAll, handleToggleOption, invertSelection, handleSearch, applyFilter, clearFilter,
  }
}
