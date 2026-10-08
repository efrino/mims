// composables/useTableColumns.ts
import { ref, computed, watch } from 'vue'

// ── Static left columns ───────────────────────────────────────────
export interface LeftColumn {
    key: string
    label: string
    defaultWidth: number
    minWidth: number
    sticky: number // left offset px
    align?: 'left' | 'center' | 'right'
}

export const LEFT_COLUMNS: LeftColumn[] = [
    { key: 'no', label: 'NO', defaultWidth: 50, minWidth: 40, sticky: 0, align: 'center' },
    // TIPE baris: FP / WIP (1 tabel sejak 2026-09-24, sebelumnya 2 sheet terpisah).
    { key: 'kind', label: 'TIPE', defaultWidth: 68, minWidth: 56, sticky: 50, align: 'center' },
    // "JOB - PART" + PART NAME di baris ke-2 (2026-09-16). Filter kolom ini
    // mencari job no / part no / part name sekaligus (lihat useTableFilter).
    { key: 'partNo', label: 'JOB - PART NO.', defaultWidth: 190, minWidth: 120, sticky: 118, align: 'left' },
    // Customer sumber MDFO (Aturan #16). Satu part fisik bisa dapat forecast dari
    // beberapa customer sekaligus (mis. ADM + TMMIN) -> ditampilkan digabung.
    // MODEL digabung ke sel ini (baris ke-2, chip kecil) sejak 2026-09-16 —
    // hemat 1 kolom sticky. Filter model tetap lewat tombol filter kolom ini.
    { key: 'customer', label: 'CUSTOMER / MODEL', defaultWidth: 130, minWidth: 80, sticky: 308, align: 'center' },
    // MESIN (ms_welding.machine via API `machine`) + chip mode shift (Aturan #5).
    { key: 'machine', label: 'MESIN / SHIFT', defaultWidth: 105, minWidth: 70, sticky: 438, align: 'center' },
    { key: 'lot', label: 'QTY KBN', defaultWidth: 75, minWidth: 50, sticky: 543, align: 'center' },
    { key: 'stock', label: 'INIT. STOCK', defaultWidth: 90, minWidth: 60, sticky: 618, align: 'center' },
    { key: 'desc', label: 'DESC', defaultWidth: 150, minWidth: 100, sticky: 708, align: 'center' },
]

// v7: kolom TIPE (FP/WIP) → reset lebar tersimpan
const STORAGE_KEY = 'mutasi_table_columns_v7'

function calcStickyOffsets(widths: Record<string, number>): Record<string, number> {
    const offsets: Record<string, number> = {}
    let acc = 0
    for (const col of LEFT_COLUMNS) {
        offsets[col.key] = acc
        acc += widths[col.key] ?? col.defaultWidth
    }
    return offsets
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch { }
    return null
}

function saveToStorage(data: any) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { }
}

// ── Composable (singleton-like via module-level refs) ─────────────
const leftWidths = ref<Record<string, number>>({})
const dateWidths = ref<Record<number, number>>({})   // day → width (per D/N cell)
const hiddenDays = ref<Set<number>>(new Set())
const initialized = ref(false)

function init(maxDays: number) {
    if (initialized.value) return
    initialized.value = true

    const saved = loadFromStorage()

    // Left column widths
    const lw: Record<string, number> = {}
    for (const col of LEFT_COLUMNS) {
        lw[col.key] = saved?.leftWidths?.[col.key] ?? col.defaultWidth
    }
    leftWidths.value = lw

    // Date column widths (D/N cell width, default 46px each)
    const dw: Record<number, number> = {}
    for (let d = 1; d <= maxDays; d++) {
        dw[d] = saved?.dateWidths?.[d] ?? 46
    }
    dateWidths.value = dw

    // Hidden days
    const hd: number[] = saved?.hiddenDays ?? []
    hiddenDays.value = new Set(hd)
}

const stickyOffsets = computed(() => calcStickyOffsets(leftWidths.value))

const totalLeftWidth = computed(() =>
    LEFT_COLUMNS.reduce((sum, col) => sum + (leftWidths.value[col.key] ?? col.defaultWidth), 0)
)

function setLeftWidth(key: string, width: number) {
    const col = LEFT_COLUMNS.find(c => c.key === key)
    const min = col?.minWidth ?? 40
    leftWidths.value[key] = Math.max(min, width)
    persist()
}

function resetLeftWidth(key: string) {
    const col = LEFT_COLUMNS.find(c => c.key === key)
    if (col) leftWidths.value[key] = col.defaultWidth
    persist()
}

function setDateWidth(day: number, width: number) {
    dateWidths.value[day] = Math.max(36, width)
    persist()
}

function resetDateWidth(day: number) {
    dateWidths.value[day] = 46
    persist()
}

function toggleDay(day: number) {
    if (hiddenDays.value.has(day)) {
        hiddenDays.value.delete(day)
    } else {
        hiddenDays.value.add(day)
    }
    hiddenDays.value = new Set(hiddenDays.value) // trigger reactivity
    persist()
}

function showAllDays() {
    hiddenDays.value = new Set()
    persist()
}

function isDayVisible(day: number) {
    return !hiddenDays.value.has(day)
}

function persist() {
    saveToStorage({
        leftWidths: leftWidths.value,
        dateWidths: dateWidths.value,
        hiddenDays: [...hiddenDays.value],
    })
}

function resetAll(maxDays: number) {
    const lw: Record<string, number> = {}
    for (const col of LEFT_COLUMNS) lw[col.key] = col.defaultWidth
    leftWidths.value = lw

    const dw: Record<number, number> = {}
    for (let d = 1; d <= maxDays; d++) dw[d] = 46
    dateWidths.value = dw

    hiddenDays.value = new Set()
    persist()
}

export function useTableColumns(maxDays = 28) {
    init(maxDays)

    return {
        LEFT_COLUMNS,
        leftWidths,
        dateWidths,
        hiddenDays,
        stickyOffsets,
        totalLeftWidth,
        isDayVisible,
        toggleDay,
        showAllDays,
        setLeftWidth,
        resetLeftWidth,
        setDateWidth,
        resetDateWidth,
        resetAll,
    }
}