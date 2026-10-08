// composables/useMasterColumnFilters.ts
// Filter kolom gaya Excel utk tabel Master Data Part (dropdown per header: cari,
// centang, invert, "tambahkan ke filter yang ada", cascade antar kolom). Opsi diambil
// server-side (welding_master/filter_options) dan nilai terpilih dikirim ke list sebagai
// col_<field> JSON array. Dipisah dari master-data.vue (2026-09-22) supaya view-nya
// tidak menampung logika filter 200+ baris.
import { computed, ref } from 'vue'
import masterService from '@/services/Public/Welding/masterService'

export interface MasterFilterField {
  part_number: 'part_number'
  job: 'job'
  model: 'model'
  ckd_type: 'ckd_type'
  area: 'area'
  machine: 'machine'
  customer: 'customer'
  // Kolom gabungan (nilai "a|b", gaya Mutasi Welding)
  part_combo: 'part_combo'
  job_combo: 'job_combo'
  area_combo: 'area_combo'
  next_combo: 'next_combo'
  customer_combo: 'customer_combo'
}
export type FilterField = keyof MasterFilterField
export interface FilterItem { value: string; label: string; selected: boolean }

export type ServerFilters = Parameters<typeof masterService.getFilterOptions>[1]

const ALL_FIELDS: readonly FilterField[] = ['part_number', 'job', 'model', 'ckd_type', 'area', 'machine', 'customer', 'part_combo', 'job_combo', 'area_combo', 'next_combo', 'customer_combo']
const SEARCHABLE_FIELDS: readonly FilterField[] = ['part_number', 'job', 'model', 'ckd_type', 'machine', 'customer', 'part_combo', 'job_combo', 'area_combo', 'next_combo', 'customer_combo']
const COMBO_FIELDS: readonly FilterField[] = ['part_combo', 'job_combo', 'area_combo', 'next_combo', 'customer_combo']
const FILTER_TITLES: Record<FilterField, string> = {
  part_number:    'Filter PART NUMBER',
  job:            'Filter JOB / ALIAS',
  model:          'Filter MODEL',
  ckd_type:       'Filter JENIS CKD',
  area:           'Filter AREA',
  machine:        'Filter MESIN',
  customer:       'Filter CUSTOMER',
  part_combo:     'Filter PART NUMBER / NAMA PART',
  job_combo:      'Filter JOB NUMBER / ALIAS',
  area_combo:     'Filter AREA / MESIN',
  next_combo:     'Filter NEXT PROCESS / MESIN',
  customer_combo: 'Filter CUSTOMER / MODEL',
}
const emptyFilters = (): Record<FilterField, string[]> =>
  Object.fromEntries(ALL_FIELDS.map(f => [f, [] as string[]])) as unknown as Record<FilterField, string[]>

export const isAreaCombo = (f: FilterField) => f === 'area_combo' || f === 'next_combo'

export function useMasterColumnFilters(opts: {
  /** Filter server (layer/area/is_wip/…) yg sedang aktif — dikirim bersama cascade kolom lain. */
  serverFilters: () => ServerFilters
  /** Label bagian area pada opsi combo (zone lama → kode area baru). */
  areaLabel: (zone: string) => string
  /** Dipanggil setelah filter berubah (apply / clear) — biasanya loadList(1). */
  onChange: () => void
}) {
  const showFilter    = ref(false)
  const filterField   = ref<FilterField>('part_number')
  const filterTitle   = ref('')
  const filterStyle   = ref({ top: '0px', left: '0px' })
  const filterOptions = ref<FilterItem[]>([])
  const filterSearch  = ref('')
  const filterMerge   = ref(false)   // gabung hasil search ke filter aktif (reset tiap buka dropdown)
  const filterLoading = ref(false)
  const filters       = ref<Record<FilterField, string[]>>(emptyFilters())

  const isSearchable   = computed(() => SEARCHABLE_FIELDS.includes(filterField.value))
  const visibleOptions = computed(() => {
    if (!isSearchable.value || !filterSearch.value.trim()) return filterOptions.value
    // Longgar: tiap kata harus ada (urutan bebas), tanda pisah/spasi/titik diabaikan —
    // "57115 b" cocok "57115-BZ170-00", "bz170 57115" juga.
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_./]+/g, '')
    const words = filterSearch.value.trim().split(/\s+/).map(norm).filter(Boolean)
    return filterOptions.value.filter(opt => { const l = norm(opt.label); return words.every(w => l.includes(w)) })
  })
  const allSelected      = computed(() => visibleOptions.value.length > 0 && visibleOptions.value.every(opt => opt.selected))
  const someSelected     = computed(() => visibleOptions.value.some(opt => opt.selected) && !allSelected.value)
  const hasActiveFilters = computed(() => Object.values(filters.value).some(list => list.length > 0))

  /** Label opsi gabungan "a|b" → "a · b"; bagian area (zone lama) ditampilkan sebagai AREA BARU. */
  function comboLabel(f: FilterField, v: string): string {
    const [a, b] = v.split('|')
    const head = isAreaCombo(f) ? opts.areaLabel(a) : a
    return (head || '—') + (b && b !== 'NULL' ? ' · ' + b : '')
  }
  // JSON array (bukan join ',') — nilai combo bisa mengandung koma ("PLATE SUB-ASSY, FR SIDE MEMBER, RH").
  const colParam = (f: FilterField) => filters.value[f].length ? JSON.stringify(filters.value[f]) : null
  /** Semua col_* utk param list — satu tempat, supaya loadList & komparasi konsisten. */
  const colParams = () => Object.fromEntries(ALL_FIELDS.map(f => [`col_${f}`, colParam(f)]))

  async function buildFilterOptions(field: FilterField) {
    filterTitle.value = FILTER_TITLES[field]
    filterLoading.value = true
    filterOptions.value = []
    try {
      // Cascade: kirim filter kolom lain yg sedang aktif (server exclude field ini sendiri)
      const values = await masterService.getFilterOptions(field, opts.serverFilters(), filters.value)
      const activeSet = new Set(filters.value[field])
      const hasMatchingActive = activeSet.size > 0 && values.some(v => activeSet.has(v))
      const isCombo = COMBO_FIELDS.includes(field)
      filterOptions.value = values.map(value => ({
        value, label: isCombo ? comboLabel(field, value) : value,
        selected: !hasMatchingActive || activeSet.has(value),
      }))
    } catch (e) {
      console.error('buildFilterOptions error:', e)
      filterOptions.value = []
    } finally {
      filterLoading.value = false
    }
  }

  async function openFilter(field: FilterField, event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    // Posisikan dropdown sebelum fetch agar muncul langsung dengan loading state
    const dropdownWidth = 280
    const dropdownHeight = SEARCHABLE_FIELDS.includes(field) ? 420 : 320
    let top  = rect.bottom + 6
    let left = rect.left
    if (left + dropdownWidth > window.innerWidth)  left = Math.max(6, rect.right - dropdownWidth)
    if (top  + dropdownHeight > window.innerHeight) top  = Math.max(6, rect.top - dropdownHeight - 6)

    filterField.value  = field
    filterSearch.value = ''
    filterMerge.value  = false
    filterStyle.value  = { top: `${top}px`, left: `${left}px` }
    showFilter.value   = true
    await buildFilterOptions(field)
  }

  function closeFilter() { showFilter.value = false; filterSearch.value = '' }

  function handleToggleAll(checked: boolean) {
    const visible = new Set(visibleOptions.value.map(o => o.value))
    filterOptions.value.forEach(o => { if (visible.has(o.value)) o.selected = checked })
  }

  function handleToggleOption(item: FilterItem) {
    // Semua tercentang (state awal "tampilkan semua") + klik satu → exclusive select:
    // centang HANYA item itu. Tanpa ini, klik = toggle off = malah meng-exclude item itu.
    const allEverySelected = filterOptions.value.every(opt => opt.selected)
    if (allEverySelected && item.selected) filterOptions.value.forEach(opt => { opt.selected = opt.value === item.value })
    else item.selected = !item.selected
  }

  function invertSelection() { visibleOptions.value.forEach(o => { o.selected = !o.selected }) }
  function handleSearch(query: string) { filterSearch.value = query }

  function applyFilter() {
    // Saat search aktif, opsi tak terlihat tetap selected=true → seleksi HANYA dari yg terlihat,
    // kalau tidak "semua hasil search tercentang" dianggap "tidak ada filter" (ke-reset diam-diam).
    const isSearching = isSearchable.value && !!filterSearch.value.trim()
    const pool = isSearching ? visibleOptions.value : filterOptions.value
    const selected = pool.filter(o => o.selected).map(o => o.value)
    // Semua opsi terpilih (tanpa search) → tidak ada filter.
    let effective = (!isSearching && selected.length === filterOptions.value.length) ? [] : selected
    // "Tambahkan ke filter yang ada" (Excel: Add current selection to filter) — union dgn filter lama
    if (isSearching && filterMerge.value && filters.value[filterField.value].length) {
      effective = [...new Set([...filters.value[filterField.value], ...selected])]
    }
    filters.value[filterField.value] = effective
    closeFilter()
    opts.onChange()
  }

  const isFilterActive = (field: FilterField) => filters.value[field].length > 0

  function clearFilter(field?: FilterField) {
    if (field) {
      filters.value[field] = []
      if (showFilter.value && filterField.value === field) buildFilterOptions(field)
    } else {
      filters.value = emptyFilters()
    }
    opts.onChange()   // filter kolom server-side → selalu reload
  }

  return {
    showFilter, filterField, filterTitle, filterStyle, filterOptions, filterSearch, filterMerge, filterLoading, filters,
    isSearchable, visibleOptions, allSelected, someSelected, hasActiveFilters,
    comboLabel, colParam, colParams,
    openFilter, closeFilter, handleToggleAll, handleToggleOption, invertSelection, handleSearch, applyFilter, isFilterActive, clearFilter,
  }
}
