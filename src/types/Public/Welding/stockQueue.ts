// ─────────────────────────────────────────────────────────────
// types/stockQueue.ts
// ─────────────────────────────────────────────────────────────

export type QueueStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface QueueItem {
    id: number
    ach_id: string
    ach_urut: number
    ach_date: string
    ach_line_id: string
    ach_part_number: string
    qty_delta: number
    shift_code: 1 | 2 | string
    production_date: string
    status: QueueStatus
    category_mode: ProcessMode | null
    retry_count: number
    error_msg: string | null
    processed_at: string | null
    created_at: string
}

export interface QueueSummaryItem {
    status: QueueStatus
    cnt: number
    total_delta: number
    oldest: string | null
    newest: string | null
    last_processed: string | null
}

export interface QueueStatusResponse {
    status: 'success' | 'error'
    data: {
        summary: QueueSummaryItem[]
        pending_alert: boolean
        failed_alert: boolean
        checked_at: string
    }
}

export interface QueueListMeta {
    total: number
    page: number
    per_page: number
    pages: number
}

export interface QueueListResponse {
    status: 'success' | 'error'
    data: QueueItem[]
    meta: QueueListMeta
}

export type ProcessMode = 'INHOUSE' | 'OUTHOUSE' | 'ALL'

// Konfigurasi tampilan badge mode pemrosesan (keterangan inhouse/outhouse)
export const MODE_CONFIG: Record<ProcessMode, {
    label: string
    short: string
    bg: string
    text: string
    border: string
}> = {
    INHOUSE: { label: 'In-House', short: 'IN', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
    OUTHOUSE: { label: 'Out-House', short: 'OUT', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
    ALL: { label: 'Semua', short: 'ALL', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
}

export interface QueueActionResponse {
    status: 'success' | 'error'
    message?: string
    affected?: number
    mode?: ProcessMode
    summary?: QueueSummaryItem[]
    processed_at?: string
}

export interface AutoModeResponse {
    status: 'success' | 'error'
    message?: string
    mode: ProcessMode
}

export interface QueueListFilters {
    status?: string
    production_date?: string
    part_number?: string
    shift_code?: 1 | 2 | ''
    page?: number
    per_page?: number
}

// Detail deduction per ifpp part (dari ms_welding_to_ifpp join ms_rundown_ifpp_andon)
export type DeductionCategory = 'INHOUSE' | 'OUTHOUSE'

export interface DeductionDetail {
    part_number_ifpp: string
    job_number_ifpp: string
    category: DeductionCategory | string | null
    bq: number
    qty_deducted: number        // qty_delta * bq
    stock_before: number | null // stok sebelum deduction (dari log jika ada)
    stock_after: number         // stok sekarang di ms_rundown_ifpp_andon
    ifpw_stock: number | null   // stok IFPW jika tabel sudah ada
}

export interface QueueDetail {
    queue: QueueItem
    deductions: DeductionDetail[]
}

export interface QueueDetailResponse {
    status: 'success' | 'error'
    data: QueueDetail
}

// Audit rekonsiliasi backlog FAILED (lihat M_stock_queue::getReconciliation).
// ms_rundown_ifpp adalah MyISAM (non-transactional) - deduksi IFPP baris
// FAILED kemungkinan besar SUDAH permanen; failed_qty_sum di sini adalah
// estimasi backlog wip_stock/ms_rundown_ifpw_stock yang belum ter-refleksi,
// BUKAN indikasi IFPP belum dikurangi.
export interface ReconcileRow {
    ach_part_number: string
    failed_count: number
    failed_qty_sum: number
    last_error_msg: string | null
    first_failed_at: string | null
    last_failed_at: string | null
    part_number_ifpp: string | null
    category: DeductionCategory | string | null
    bq: number | null
    ifpp_stock_now: number | null
    wip_stock_now: number | null
    has_ifpp_mapping: boolean
}

export interface ReconcileMeta {
    total_parts: number
    total_failed_rows: number
    total_failed_qty: number
}

export interface ReconcileResponse {
    status: 'success' | 'error'
    data: ReconcileRow[]
    meta: ReconcileMeta
}

// Part IFPP berstok tapi tidak terdeduksi dalam N hari
// (lihat M_stock_queue_health::getReportTanpaPergerakan)
export interface NoMovementRow {
    part_number: string
    job_number: string | null
    routing: string | null
    category: string | null
    stock: number | string
    plan_day: number | string | null
    strength: number | string | null
    status: string | null
    kondisi_mapping: 'ADA mapping' | 'TANPA mapping' | string
    jml_welding_termapping: number | string
    daftar_welding: string | null
    terakhir_terdeduksi: string | null
    dugaan: string
}

export interface NoMovementMeta {
    hari: number
    total_part: number
    tanpa_mapping: number
    ada_mapping: number
    total_stok: number
    catatan: string
}

export interface NoMovementResponse {
    status: 'success' | 'error'
    data: NoMovementRow[]
    meta: NoMovementMeta
}


// Audit pengurang welding vs Master IFPP (ms_ifpp_master_src)
export type AuditStatus =
    | 'OK'
    | 'MANDEK'
    | 'TANPA MAPPING'
    | 'BELUM PERNAH TERDEDUKSI'
    | 'TIDAK ADA DI RUNDOWN'
    | 'MAPPING RUSAK TOTAL'
    | 'MAPPING RUSAK SEBAGIAN'

export interface AuditMasterRow {
    part_number: string
    job_number: string | null
    category: string | null
    routing: string | null
    customer: string | null
    stock_master: number | string | null
    plan_day: number | string | null
    ada_di_rundown: number | string
    stock_rundown: number | string | null
    status_rundown: string | null
    jml_welding: number | string
    daftar_welding: string | null
    mapping_rusak: number | string
    terakhir_deduksi: string | null
    status_audit: AuditStatus | string
}

export interface AuditMasterSumber {
    source_file: string
    baris: number | string
    single_part: number | string
    non_single: number | string
    sheet_generated: string | null
    imported_at: string | null
}

export interface AuditMasterMeta {
    total_diaudit: number
    per_status: Record<string, number>
    dikecualikan: { routing_SINGLE: number }
    sumber: AuditMasterSumber[]
    catatan: string
}

export interface AuditMasterResponse {
    status: 'success' | 'error'
    data: AuditMasterRow[]
    meta: AuditMasterMeta
}

export interface MasterStatusResponse {
    status: 'success' | 'error'
    data: AuditMasterSumber[]
}

export interface ImportMasterResponse {
    status: 'success' | 'error'
    data: {
        source_file: string
        berkas: string
        sheet_generated: string | null
        baris_masuk: number
        baris_dilewati: number
        part_duplikat: Record<string, number>
        routing: Record<string, number>
        imported_at: string
    }
    message?: string
}

// Helper: config per status (light theme)
export const STATUS_CONFIG: Record<QueueStatus, {
    label: string
    bg: string
    text: string
    border: string
    dot: string
    badgeBg: string
}> = {
    PENDING: { label: 'Menunggu', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500', badgeBg: 'bg-amber-100' },
    PROCESSING: { label: 'Diproses', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500', badgeBg: 'bg-blue-100' },
    DONE: { label: 'Selesai', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500', badgeBg: 'bg-green-100' },
    FAILED: { label: 'Gagal', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500', badgeBg: 'bg-red-100' },
}