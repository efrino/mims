// composables/useTableFilter.ts
//
// Singleton pattern (module-level refs) — sama seperti useTableColumns.
// Tambahan: filterSearch untuk pencarian di dalam dropdown filter,
// hanya aktif untuk field jobNo dan partNo (karena banyak opsi).

import { ref, computed, type Ref } from 'vue'
import type {
    FilterOptions,
    FilterItem,
    FilterField,
    FilterPosition,
    Job,
} from '@/types/Public/Welding/planning'

// ── Module-level state (singleton) ───────────────────────────────
const showFilter = ref(false)
const filterField = ref<FilterField>('jobNo')
const filterTitle = ref('')
const filterStyle = ref<FilterPosition>({ top: '0px', left: '0px' })
const filterOptions = ref<FilterItem[]>([])
const filterSearch = ref('')   // ← search text di dalam dropdown
const filterMerge = ref(false)   // "Tambahkan ke filter yang ada" (Excel: Add current selection to filter)
let searchSnapshot: Map<string, boolean> | null = null   // centang sebelum mulai mencari

const filters = ref<FilterOptions>({
    kind: [],
    jobNo: [],
    partNo: [],
    model: [],
    machine: [],
    description: [],
})

let _jobs: Ref<Job[]> = ref([])

// Field yang menampilkan search box
const SEARCHABLE_FIELDS: FilterField[] = ['jobNo', 'partNo', 'model', 'machine']

// ── Kunci gabungan kolom CUSTOMER / MODEL & MESIN / SHIFT (2026-09-16) ──
// Filter memakai kunci gabungan supaya 1 opsi = 1 kombinasi persis yang
// tampil di sel, dan label-nya bisa dicari lewat kotak search.
const SMODE_LABEL: Record<string, string> = { both: '2 Shift', day: 'Siang saja', night: 'Malam saja' }
export function custLabel(job: Job): string {
    const cs = job.mdfoCustomers ?? []
    return cs.length ? cs.join(' + ') : '—'
}
export function custKey(job: Job): string {
    return custLabel(job) + '|' + (job.model ?? '')
}
export function machLabel(job: Job): string {
    return (job.machine && job.machine.trim()) ? job.machine : '—'
}
export function machKey(job: Job): string {
    return machLabel(job) + '|' + (job.shiftMode || 'both')
}

// Diekstrak jadi fungsi murni supaya bisa dipakai ulang untuk beberapa
// jobs-list independen (mis. sheet FP & WIP tampil bersamaan via v-show,
// masing-masing punya filteredJobs sendiri walau berbagi seleksi filter).
export function applyJobFilters(jobs: Job[], filters: FilterOptions): Job[] {
    let result = [...jobs]

    if (filters.kind.length) {
        result = result.filter(job => filters.kind.includes(job.kind ?? 'FP'))
    }

    if (filters.jobNo.length) {
        result = result.filter(job => filters.jobNo.includes(job.jobNo))
    }
    if (filters.partNo.length) {
        result = result.filter(job => filters.partNo.includes(job.partNo))
    }
    if (filters.model.length) {
        result = result.filter(job => filters.model.includes(custKey(job)))
    }
    if (filters.machine.length) {
        result = result.filter(job => filters.machine.includes(machKey(job)))
    }
    if (filters.description.length) {
        result = result.map(job => ({
            ...job,
            descriptions: job.descriptions.filter((desc: any) =>
                filters.description.includes(desc.type)
            ),
        }))
    }

    return result
}

// ── Composable ────────────────────────────────────────────────────
export function useTableFilter(jobs?: Ref<Job[]>) {
    if (jobs) _jobs = jobs

    // ── Computed ──────────────────────────────────────────────────

    /** Apakah field aktif punya search box */
    const isSearchable = computed(() =>
        SEARCHABLE_FIELDS.includes(filterField.value)
    )

    /**
     * filterOptions yang sudah difilter oleh filterSearch.
     * Hanya berlaku untuk jobNo & partNo. model/description tampil semua.
     */
    const visibleOptions = computed<FilterItem[]>(() => {
        if (!isSearchable.value || !filterSearch.value.trim()) {
            return filterOptions.value
        }
        // Multi-kata = AND (mis. "sl mb28" cocok dgn "SLC36 - MB282666")
        const words = filterSearch.value.trim().toLowerCase().split(/\s+/)
        return filterOptions.value.filter(opt => {
            const label = opt.label.toLowerCase()
            return words.every(w => label.includes(w))
        })
    })

    /** Select All — mengacu pada visibleOptions saja */
    const allSelected = computed(() =>
        visibleOptions.value.length > 0 &&
        visibleOptions.value.every(opt => opt.selected)
    )

    /** Partial select — untuk indeterminate state checkbox "Select All" */
    const someSelected = computed(() =>
        visibleOptions.value.some(opt => opt.selected) && !allSelected.value
    )

    const filteredJobs = computed<Job[]>(() => applyJobFilters(_jobs.value, filters.value))

    const hasActiveFilter = computed(() =>
        filters.value.kind.length > 0 ||
        filters.value.jobNo.length > 0 ||
        filters.value.partNo.length > 0 ||
        filters.value.model.length > 0 ||
        filters.value.machine.length > 0 ||
        filters.value.description.length > 0
    )

    // ── Methods ───────────────────────────────────────────────────

    function getFilteredJobsExcluding(excludeField: FilterField): Job[] {
        return _jobs.value.filter(job => {
            if (excludeField !== 'kind' && filters.value.kind.length > 0 && !filters.value.kind.includes(job.kind ?? 'FP')) return false
            if (excludeField !== 'jobNo' && filters.value.jobNo.length > 0 && !filters.value.jobNo.includes(job.jobNo)) return false
            if (excludeField !== 'partNo' && filters.value.partNo.length > 0 && !filters.value.partNo.includes(job.partNo)) return false
            if (excludeField !== 'model' && filters.value.model.length > 0 && !filters.value.model.includes(custKey(job))) return false
            if (excludeField !== 'machine' && filters.value.machine.length > 0 && !filters.value.machine.includes(machKey(job))) return false
            return true
        })
    }

    const openFilter = (field: FilterField, event: MouseEvent) => {
        const button = event.currentTarget as HTMLElement
        const rect = button.getBoundingClientRect()

        filterField.value = field
        filterSearch.value = ''   // reset search tiap buka filter baru
        filterMerge.value = false
        searchSnapshot = null

        let options: FilterItem[] = []

        switch (field) {
            case 'kind': {
                const counts = new Map<string, number>()
                for (const j of getFilteredJobsExcluding('kind')) { const k = j.kind ?? 'FP'; counts.set(k, (counts.get(k) ?? 0) + 1) }
                options = ['FP', 'WIP'].filter(k => counts.has(k)).map(k => ({
                    value: k,
                    label: `${k} (${counts.get(k)})`,
                    selected: !filters.value.kind.length || filters.value.kind.includes(k),
                }))
                filterTitle.value = 'Filter TIPE'
                break
            }

            case 'jobNo':
                options = [...new Set(getFilteredJobsExcluding('jobNo').map(j => j.jobNo))].sort().map(v => ({
                    value: v,
                    label: v,
                    selected: !filters.value.jobNo.length || filters.value.jobNo.includes(v),
                }))
                filterTitle.value = 'Filter JOB NO.'
                break

            case 'partNo': {
                // Kolom gabungan PART / JOB (2026-09-16): nilai filter tetap partNo,
                // tapi LABEL memuat job no + part no + part name supaya kotak cari
                // di dropdown mengenai ketiganya.
                const seen = new Map<string, Job>()
                for (const j of getFilteredJobsExcluding('partNo')) if (!seen.has(j.partNo)) seen.set(j.partNo, j)
                options = [...seen.values()]
                    .sort((a, b) => a.partNo.localeCompare(b.partNo))
                    .map(j => ({
                        value: j.partNo,
                        label: (j.jobNo ? j.jobNo + ' - ' : '') + j.partNo + (j.partName ? ' · ' + j.partName : ''),
                        selected: !filters.value.partNo.length || filters.value.partNo.includes(j.partNo),
                    }))
                filterTitle.value = 'Filter PART / JOB NO.'
                break
            }

            case 'model': {
                const seen = new Map<string, Job>()
                for (const j of getFilteredJobsExcluding('model')) { const k = custKey(j); if (!seen.has(k)) seen.set(k, j) }
                options = [...seen.entries()]
                    .map(([k, j]) => ({
                        value: k,
                        label: custLabel(j) + (j.model ? ' - ' + j.model : ''),
                        selected: !filters.value.model.length || filters.value.model.includes(k),
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label))
                filterTitle.value = 'Filter CUSTOMER - MODEL'
                break
            }

            case 'machine': {
                const seen = new Map<string, Job>()
                for (const j of getFilteredJobsExcluding('machine')) { const k = machKey(j); if (!seen.has(k)) seen.set(k, j) }
                options = [...seen.entries()]
                    .map(([k, j]) => ({
                        value: k,
                        label: machLabel(j) + ' - ' + (SMODE_LABEL[j.shiftMode || 'both'] ?? j.shiftMode),
                        selected: !filters.value.machine.length || filters.value.machine.includes(k),
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label))
                filterTitle.value = 'Filter MESIN - MODE'
                break
            }

            case 'description': {
                const descTypes = [
                    { value: 'FORECAST', label: 'MDFO' },
                    { value: 'DELIVERY', label: 'ACT. DELIVERY (DN)' },
                    { value: 'PLAN', label: 'PLAN PRODUKSI' },
                    { value: 'ACTUAL', label: 'ACT. PRODUCTION' },
                    { value: 'BALANCE', label: 'BALANCE' },
                    { value: 'STOCK', label: 'ACTUAL STOCK' },
                    { value: 'STRENGTH', label: 'STRENGTH (JAM)' },
                    { value: 'PCS_PER_DAY', label: 'PCS / DAY' },
                    
                ]
                options = descTypes.map(d => ({
                    ...d,
                    selected: !filters.value.description.length ||
                        filters.value.description.includes(d.value),
                }))
                filterTitle.value = 'Filter DESC'
                break
            }
        }

        // Nilai filter lama tak ada lagi di opsi (mis. ganti area) → tampilkan semua tercentang.
        if (options.length && !options.some(o => o.selected)) options.forEach(o => { o.selected = true })
        filterOptions.value = options

        // Auto-adjust posisi dropdown agar tidak keluar viewport
        const dropdownWidth = 260
        const dropdownHeight = SEARCHABLE_FIELDS.includes(field) ? 400 : 320

        let top = rect.bottom + 5
        let left = rect.left

        if (left + dropdownWidth > window.innerWidth) left = rect.right - dropdownWidth
        if (top + dropdownHeight > window.innerHeight) top = rect.top - dropdownHeight - 5

        filterStyle.value = { top: `${top}px`, left: `${left}px` }
        showFilter.value = true
    }

    const closeFilter = () => {
        showFilter.value = false
        filterSearch.value = ''
        searchSnapshot = null
    }

    /** Select All / Deselect All — hanya pada opsi yang tampil (hasil pencarian). */
    const toggleAll = (checked: boolean) => {
        const visibleValues = new Set(visibleOptions.value.map(o => o.value))
        filterOptions.value.forEach(opt => {
            if (visibleValues.has(opt.value)) opt.selected = checked
        })
    }

    /** Invert — balik centang opsi yang tampil. */
    const invertSelection = () => {
        visibleOptions.value.forEach(opt => { opt.selected = !opt.selected })
    }

    /**
     * Pencarian gaya Excel: saat mengetik, SEMUA hasil pencarian otomatis tercentang
     * (yang diterapkan = hasil yg tercentang saja). Search dikosongkan → centang
     * kembali ke kondisi sebelum mencari.
     */
    const setSearch = (q: string) => {
        if (!searchSnapshot) searchSnapshot = new Map(filterOptions.value.map(o => [o.value, o.selected]))
        filterSearch.value = q
        if (!q.trim()) {
            filterOptions.value.forEach(o => { o.selected = searchSnapshot!.get(o.value) ?? true })
            searchSnapshot = null
            return
        }
        const hits = new Set(visibleOptions.value.map(o => o.value))
        filterOptions.value.forEach(o => { o.selected = hits.has(o.value) || (searchSnapshot!.get(o.value) ?? false) })
    }

    /**
     * Terapkan. Saat search aktif, hanya hasil pencarian yang dihitung (Excel);
     * "Tambahkan ke filter yang ada" = gabung (union) dengan filter kolom ini.
     * Tanpa search + semua tercentang = tidak ada filter (ikon non-aktif).
     */
    const applyFilter = () => {
        const isSearching = !!filterSearch.value.trim()
        const pool = isSearching ? visibleOptions.value : filterOptions.value
        const selected = pool.filter(opt => opt.selected).map(opt => opt.value)
        if (!selected.length) return   // Excel: OK nonaktif bila tak ada yg dicentang

        const current = filters.value[filterField.value]
        let effective = (!isSearching && selected.length === filterOptions.value.length) ? [] : selected
        if (isSearching && filterMerge.value && current.length) effective = [...new Set([...current, ...selected])]

        filters.value[filterField.value] = effective
        closeFilter()
    }

    const clearFilter = (field?: FilterField) => {
        if (field) {
            filters.value[field] = []
        } else {
            for (const k of Object.keys(filters.value) as FilterField[]) filters.value[k] = []
        }
    }

    /** Tombol Reset di dropdown = "Clear Filter From <kolom>" lalu tutup. */
    const resetFilter = () => {
        clearFilter(filterField.value)
        closeFilter()
    }

    const activeCount = computed(() => filters.value[filterField.value]?.length ?? 0)

    return {
        // State
        showFilter,
        filterField,
        filterTitle,
        filterStyle,
        filterOptions,
        filterSearch,
        filterMerge,
        filters,
        // Computed
        allSelected,
        someSelected,
        isSearchable,
        visibleOptions,
        filteredJobs,
        hasActiveFilter,
        activeCount,
        // Methods
        openFilter,
        closeFilter,
        toggleAll,
        invertSelection,
        setSearch,
        applyFilter,
        clearFilter,
        resetFilter,
    }
}