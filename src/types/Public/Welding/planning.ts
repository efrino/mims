// types/Public/Welding/planning.ts

// ── Description types ─────────────────────────────────────────────
export type DescriptionType =
    | 'FORECAST'
    | 'DELIVERY'
    | 'PLAN'
    | 'ACTUAL'
    | 'BALANCE'
    | 'STOCK'
    | 'STRENGTH'
    | 'PCS_PER_DAY'

export type ShiftTarget = 'day' | 'night' | 'both'

export type PlanActionType =
    | 'MANUAL_EDIT'
    | 'LOCK'
    | 'UNLOCK'
    | 'SP_OVERRIDE'
    | 'RESET_AUTO'

// ── Per-tanggal data ──────────────────────────────────────────────
export interface DateData {
    day?: number | null
    night?: number | null
    is_dn?: boolean             // PLAN: true=dari DN (bold), false=dari MDFO (abu-abu)
    pcs_per_day?: number | null // STRENGTH: metadata tooltip

    // Lock info — hanya ada di PLAN
    lock_day?: boolean
    lock_night?: boolean
    plan_day_auto?: number | null   // nilai terakhir dari SP (untuk reset)
    plan_night_auto?: number | null
    locked_by?: string | null
    locked_at?: string | null
    lock_note?: string | null
    day_note?: string | null    // Keterangan (Aturan #7) — kenapa plan day sebesar ini
    night_note?: string | null  // Keterangan (Aturan #7) — kenapa plan night sebesar ini

    // Stock adjust info — hanya ada di STOCK
    stock_adjust_day?: boolean
    stock_adjust_night?: boolean
    stock_adjust_by?: string | null
    stock_adjust_at?: string | null
    stock_adjust_note?: string | null

    // Proyeksi (hari > cutoff / malam belum jalan) — STOCK/STRENGTH/BALANCE
    projected_day?: boolean
    projected_night?: boolean

    // FORECAST (MDFO): rincian per customer (Aturan #16). Satu part fisik bisa
    // menerima forecast dari beberapa customer sekaligus, mis. { 'ADM PLANT 5': 400,
    // 'TMMIN': 637 } — jumlahnya = nilai `night` yang tampil di sel.
    by_customer?: Record<string, number>

    // DELIVERY (DN, 2026-09-25): porsi dari DO nyata (sisanya dari SO) + adjust manual per shift.
    do_day?: number
    do_night?: number
    adj_day?: DnAdjustInfo
    adj_night?: DnAdjustInfo
    // DELIVERY: rincian DN per customer (kode part yg dikirim) — bentuk berbeda dari FORECAST
    // { 'TMMIN': { day: 0, night: 660, codes: ['52141-BZ100-00-28'] } }. Diketik longgar
    // karena berbagi nama field dgn FORECAST/PCS_PER_DAY (number).

    // Mutasi WIP: baris Σ PARENT bisa diklik utk detail mini-mutasi
    clickable?: boolean
    // Mutasi WIP PLAN: plan dipangkas TPT cap mesin (bottleneck/downtime risk)
    capped_day?: boolean
    capped_night?: boolean
}

// Adjust DN manual 1 sel (mutasi_weld_dn_adjust). mode: auto = manual sampai DO nyata
// masuk lalu DO; manual = selalu manual; system = selalu DN sistem (SO/DO).
export type DnAdjustMode = 'auto' | 'manual' | 'system'
export interface DnAdjustInfo {
    manual_qty: number
    mode: DnAdjustMode
    system_qty: number | null
    has_do: boolean
    note: string | null
    by: string | null
    at: string | null
}

// ── Mutasi WIP: detail induk per hari (mini-mutasi) ───────────────
export interface WipParentDaily {
    partNo: string
    partName: string
    qty_kbn: number
    bq: number
    pcs: number
    plan_day: number
    plan_night: number
    stock: number
    strength: number
}

export interface WipParentInfo {
    partNo: string
    partName: string
    area: string
    machine: string
    op: number
    qty_kbn: number
    bq: number
}

// ── Satu baris description dalam job ─────────────────────────────
export interface Description {
    type: DescriptionType
    label: string
    dates: Record<number, DateData>
    total: number
}


// Jenis baris Mutasi Bulanan — FP (mutasi_weld) dan WIP tampil dalam 1 tabel.
export type MutasiKind = 'FP' | 'WIP'

// ── Satu job (satu part) ──────────────────────────────────────────
export interface Job {
    kind?: MutasiKind          // diisi composable (FP / WIP) — dasar routing aksi per baris
    sortMachine?: string | null // FP: mesin kunci urut dari backend (rute, fallback MIN mesin master) — sama dgn LKH
    areaCode?: string | null   // zone (mutasi_weld.area_code) baris ini — sumber area utk operasi tulis saat halaman menampilkan area master gabungan
    jobNo: string
    partNo: string
    partName: string          // nama part dari master ms_welding (FP); WIP: apa adanya
    carName?: string          // car name (mutasi_weld.part_name lama), info saja
    model: string
    qty_kbn: number
    initialStock: number
    // Initial stock manual-lock info (dari backend _pivot_to_jobs)
    initialStockLocked?: boolean      // true = di-set manual, tidak ikut refresh carry-forward bulan lalu
    initialStockBy?: string | null
    initialStockAt?: string | null
    // Mode shift kerja part (Aturan #5): 'both' (default) | 'day' | 'night'
    shiftMode?: 'both' | 'day' | 'night'
    // Customer sumber MDFO (Aturan #16) — bisa >1 utk part fisik yang sama,
    // mis. ['ADM PLANT 5', 'TMMIN']. Dipakai kolom CUSTOMER di grid.
    mdfoCustomers?: string[]
    // 'mdfo' (otoritatif) | 'master' (fallback ms_welding bila MDFO bulan ini kosong)
    customerSource?: 'mdfo' | 'master'
    // Status di Master Data bila baris ini BUKAN lagi FP aktif di area ini (runout,
    // pindah area, kini WIP, …). Tetap tampil karena ada produksi/stok bulan ini.
    masterStatus?: { code: 'runout' | 'merged' | 'moved' | 'now_wip' | 'unregistered'; label: string; note: string } | null
    descriptions: Description[]

    // Mutasi WIP (opsional): info mesin/OP WIP + breakdown induk
    machine?: string
    uph?: number | null   // pcs/jam mesin — dipakai panel kapasitas modal edit plan (Aturan #7)
    op?: number | null
    parents?: WipParentInfo[]
    parentDaily?: Record<number, WipParentDaily[]>

    // Mutasi WIP (opsional): safety dinamis per-WIP (band warna strength + tooltip)
    strengthSafeMin?: number
    strengthSafeMax?: number
    strengthSource?: 'master'   // FP: band dari master Strength Standard (per part)
    safetyNote?: string | null
    safetyFanout?: number | null
    safetyContention?: number | null
    safetyHours?: number | null

    // Buffer Mesin OFF (styling grid) — murni info baca, tak mempengaruhi angka plan.
    machineOff?: Record<number, { day: boolean; night: boolean }>
    bufferBuild?: Record<number, { targetQty: number; offStart: string; offEnd: string; offDays: number }>
}

// ── Lock row (dari endpoint /lock_status) ─────────────────────────
export interface LockRow {
    part_number: string
    tanggal: number
    plan_day: number
    plan_night: number
    plan_day_auto: number | null
    plan_night_auto: number | null
    lock_plan_day: boolean
    lock_plan_night: boolean
    locked_by: string | null
    locked_at: string | null
    lock_note: string | null
}

// ── Plan log entry (dari endpoint /plan_log) ──────────────────────
export interface PlanLogEntry {
    id: number
    period_year: number
    period_month: number
    area_code: string
    part_number: string
    tanggal: number
    plan_day_before: number | null
    plan_night_before: number | null
    plan_day_after: number | null
    plan_night_after: number | null
    lock_plan_day: boolean
    lock_plan_night: boolean
    changed_by: string | null
    changed_at: string
    action_type: PlanActionType
    note: string | null
}

// ── Payload untuk lock/unlock ─────────────────────────────────────
export interface LockPlanPayload {
    year: number
    month: number
    area_code: string
    part_number: string
    tanggal: number
    shift: ShiftTarget
    plan_day?: number | null    // opsional: sekaligus ubah nilai
    plan_night?: number | null  // opsional: sekaligus ubah nilai
    lock: 0 | 1                 // 1=lock, 0=unlock
    note?: string | null
    reason?: PlanReasonCode | null  // alasan edit manual (bahan analisis pola planner)
}

// Alasan edit plan manual — kode sama dgn M_mutasi_weld::PLAN_REASONS (backend).
export const PLAN_REASONS = [
    { code: 'DN_PENDING',     label: 'DN belum rilis',   icon: 'mdi-truck-alert-outline' },
    { code: 'MACHINE_DOWN',   label: 'Mesin down',       icon: 'mdi-robot-industrial-outline' },
    { code: 'HOLIDAY_BUFFER', label: 'Buffer libur',     icon: 'mdi-calendar-star' },
    { code: 'CUSTOMER_REQ',   label: 'Permintaan customer', icon: 'mdi-account-alert-outline' },
    { code: 'MATERIAL',       label: 'Material kurang',  icon: 'mdi-package-variant-remove' },
    { code: 'MANPOWER',       label: 'Manpower',         icon: 'mdi-account-group-outline' },
    { code: 'CAPACITY',       label: 'Kapasitas mesin',  icon: 'mdi-scale-balance' },
    { code: 'OTHER',          label: 'Lainnya',          icon: 'mdi-dots-horizontal' },
] as const
export type PlanReasonCode = typeof PLAN_REASONS[number]['code']

// ── Payload untuk reset ke auto ───────────────────────────────────
export interface ResetPlanPayload {
    year: number
    month: number
    area_code: string
    part_number: string
    tanggal: number
    shift: ShiftTarget
}

// ── Payload untuk bulk unlock ─────────────────────────────────────
export interface BulkUnlockPayload {
    year: number
    month: number
    area_code: string
    part_number?: string // opsional — jika kosong, unlock semua part
}

// ── Response satu baris plan (dari lock/reset) ────────────────────
export interface PlanRowResponse {
    tanggal: number
    plan_day: number
    plan_night: number
    plan_day_auto: number | null
    plan_night_auto: number | null
    lock_plan_day: boolean
    lock_plan_night: boolean
    locked_by: string | null
    locked_at: string | null
    lock_note: string | null
}

// ── Filter ────────────────────────────────────────────────────────
// 'model'   = kolom CUSTOMER / MODEL (nilai = "CUSTOMER|MODEL", lihat useTableFilter.custKey)
// 'machine' = kolom MESIN / SHIFT     (nilai = "MESIN|MODE",     lihat useTableFilter.machKey)
export type FilterField = 'kind' | 'jobNo' | 'partNo' | 'model' | 'machine' | 'description'

export interface FilterItem {
    value: string
    label: string
    selected: boolean
}

export interface FilterOptions {
    kind: string[]
    jobNo: string[]
    partNo: string[]
    model: string[]
    machine: string[]
    description: string[]
}

export interface FilterPosition {
    top: string
    left: string
    [key: string]: string | undefined
}