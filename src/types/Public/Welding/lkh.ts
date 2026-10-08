// types/Public/Welding/lkh.ts

// ================================================================
// PARAMS
// ================================================================
export interface LKHGenerateParams {
    date: string;   // YYYY-MM-DD
    shift: 1 | 2;
    area: string;   // WSS_ADM, WSS_MTS, dll
}

// ================================================================
// STATUS
// 'MDFO' = Tentative — masih pakai forecast, belum ada DN
// 'DN'   = Fix       — sudah pakai delivery note
// ================================================================
export type LKHStatus = 'MDFO' | 'DN'

// ================================================================
// DATA ROW — sesuai kolom tabel lkh_weld
// ================================================================
export interface LKHData {
    id: number;
    period: string;
    date: string;
    patan: string;
    shift: number;
    time_shift: string;
    area: string;

    // Sumber data per baris (dari SP)
    data_source: LKHStatus;

    // Status plan per baris:
    //   'FP'      = sudah fix dari DN
    //   'PREVIEW' = masih tentative (MDFO/forecast)
    //   'CARRYOVER' = sisa dari shift sebelumnya
    status_plan: 'FP' | 'PREVIEW' | 'CARRYOVER' | null;

    // Identitas
    urut: number | null;
    urut_plan: number | null;
    part_number: string;
    job_number: string | null;
    mc_weld: string | null;

    // Kapasitas
    sum_nut_spot: number;
    qty_kbn: number;
    total_process: number;
    plan_process: number;
    plan_process_original: number;
    carryover: number;

    // PATAN
    patan_sum_kbn: number;
    patan_lot_size: number;
    patan_lot_cycle: number | null;
    patan_uph: number;
    patan_sum_stroke: number;
    patan_tpt: number;

    // PLANNING PROD
    cutoff_sum_kbn: number;
    cutoff_lot_size: number;
    cutoff_sum_stroke: number;
    cutoff_tpt: number;

    // Actual — VARCHAR di DB (bisa kosong/null)
    actual_lot_size: string | null;
    actual_pjk: string | null;
    actual_tpt: string | null;

    // Lainnya
    blc: string | null;
    keterangan: string | null;
    level_bom: number | null;
    parent_schedule_id: number | null;
    is_wip: number;
    schedule_id: number | null;

    // Timestamps
    created_at: string;
    created_by: string | null;
    updated_at: string | null;
    updated_by: string | null;

    // JOIN dari ms_data_ifp
    part_name: string | null;
    packing: string | null;
    customer: string | null;
    project: string | null;

    // JOIN dari ms_welding
    model: string | null;
}

// ================================================================
// SUMMARY — dihitung PHP dari data sebelum return
// ================================================================
export interface LKHSummary {
    total_jobs: number;
    total_plan_process: number;
    total_patan_stroke: number;
    total_patan_tpt: number;
    total_cutoff_stroke: number;
    total_cutoff_tpt: number;
    total_actual_lot: number;
    total_actual_tpt: number;
    total_carryover: number;   // jumlah (sum) dari kolom carryover
    total_fp: number;          // baris status_plan = 'FP'
    total_preview: number;     // baris status_plan = 'PREVIEW'
    carryover_count: number;   // jumlah baris status_plan = 'CARRYOVER'
}

// ================================================================
// META
// ================================================================
export interface LKHMeta {
    date: string;
    shift: number;
    area: string;
    total_records: number;
    last_updated: string | null;
}

// ================================================================
// API RESPONSES
// ================================================================

// Response GET biasa (fetch tanpa prosedur)
export interface LKHFetchResponse {
    success: boolean;
    message?: string;
    data: LKHData[];
    summary: LKHSummary | null;
    meta: LKHMeta;
}

// Response POST refresh (setelah SP jalan)
// action: 'CREATED'   = pertama kali dibuat
//         'REFRESHED' = sudah ada, di-overwrite
export interface LKHRefreshResponse {
    success: boolean;
    message?: string;
    action?: 'CREATED' | 'REFRESHED';
    // Counter dari SP sp_generate_lkh_weld
    fix_inserted: number;
    preview_inserted: number;
    was_existing: number;
    deleted: number;
    is_weekend: number;
    // Counter carryover dari sp_generate_lkh_carryover
    carryover_inserted: number;
    // Data terbaru setelah generate
    data: LKHData[];
    summary: LKHSummary | null;
    meta: LKHMeta;
}

// Backward-compat alias
export type LKHResponse = LKHRefreshResponse;

export interface LKHCheckResponse {
    success: boolean;
    exists: boolean;
    last_updated: string | null;
}

// ================================================================
// MUTASI LKH — baca langsung dari mutasi_weld (plan dari pipeline)
// ================================================================

export interface LKHMutasiParams {
    date: string;     // YYYY-MM-DD
    shift: 1 | 2;
    area: string;
}

/** Satu baris LKH dari mutasi_weld untuk tanggal + shift tertentu */
export interface LKHMutasiRow {
    part_number:   string;
    model:         string | null;
    job_no:        string | null;
    area_code:     string;
    pcs_per_day:   number;
    initial_stock: number;
    qty_kbn:       number;
    /** dn_day atau dn_night tergantung shift */
    dn:            number;
    /** plan_day atau plan_night tergantung shift */
    plan:          number;
    /** actual_day atau actual_night tergantung shift */
    actual:        number;
    /** 1 = diedit manual & dikunci (pipeline tidak menimpa), 0 = bebas pipeline */
    lock_actual:   number;
    /** Status part dari ms_welding: 'FP' = Finish Part, 'WIP' = Work In Progress */
    status_part:   'FP' | 'WIP';
    /** balance_day atau balance_night tergantung shift */
    balance:       number;
    /** stock_day atau stock_night tergantung shift */
    stock:         number;
    /** strength_day atau strength_night tergantung shift (dalam jam) */
    strength:      number;
    // Field tambahan client-side
    keterangan?:   string | null;
}

export interface LKHMutasiSummary {
    total_parts:  number;
    total_plan:   number;
    total_dn:     number;
    total_actual: number;
    /** Jumlah part yang memiliki DN (Fix) */
    dn_count:     number;
    /** Jumlah part tanpa DN (Preview/MDFO) */
    no_dn_count:  number;
}

export interface LKHMutasiMeta {
    date:  string;
    shift: number;
    area:  string;
    day:   number;
    month: number;
    year:  number;
}

// ================================================================
// LKH DUAL-SHIFT (rekonstruksi) — dari /welding_auto/lkh_dual
// ================================================================
export interface LKHDualPatan {
    kbn: number
    lot_size: number
    lot_cycle: number | null
    uph: number
    stroke: number
    tpt: number
}
export interface LKHDualShift {
    plan_kbn: number
    plan_lot_size: number
    plan_stroke: number
    plan_tpt: number
    act_pcs: number
    act_pjk: string | null
    act_blc: string | null
}
export type LKHShiftMode = 'both' | 'day' | 'night'
export type LKHShiftKey = 'day' | 'night'
/** 1 proses rute (OP) sebuah part — dipakai saklar "Pisah OP" LKH. */
export interface LKHDualOp { op: string; machine: string; ct: number; stroke: number }
export interface LKHDualRow {
    no: number
    area: string                    // zone (mutasi_weld.area_code) baris ini — dipakai saat simpan actual
    urut_plan: number | null
    job_no: string | null
    part_number: string
    part_name: string | null
    model: string | null
    mc_weld: string | null          // gabungan semua mesin rute ("A1 A2") — 1 baris/part
    proc: string
    total_proses: number
    status_part: 'FP' | 'WIP'
    shift_mode: LKHShiftMode
    sum_nut_spot: number
    ct: number                      // cycle time per pcs (detik); multi-proses = Σ CT
    ops?: LKHDualOp[]               // proses rute urut (OP10, OP20, ...)
    op?: string                     // mode Pisah OP: OP baris ini
    op_first?: boolean              // mode Pisah OP: true = OP pertama part (info part ditampilkan)
    op_last?: boolean               // mode Pisah OP: false = OP antara (plan tidak ikut TOTAL, actual di OP terakhir)
    qty_kbn: number
    patan: LKHDualPatan
    day: LKHDualShift
    night: LKHDualShift
    keterangan: string | null
}
export interface LKHDualSummary {
    total_parts: number
    total_patan_tpt: number
    total_day_tpt: number
    total_night_tpt: number
    total_day_kbn: number
    total_night_kbn: number
    total_day_lot: number
    total_night_lot: number
    total_day_act: number
    total_night_act: number
}
export interface LKHDualResponse {
    success: boolean
    message?: string
    data: LKHDualRow[]
    summary: LKHDualSummary | null
    meta: { date: string; area: string; day: number; month: number; year: number; seeded_shifts?: number[] }
}
export type LKHDualField = 'pcs' | 'pjk' | 'blc' | 'keterangan'
export interface LKHDualActualPayload {
    date: string
    area: string
    part_number: string
    shift: 'day' | 'night'
    field: LKHDualField
    value: string | number | null
    status?: 'FP' | 'WIP'           // WIP → PCS disimpan ke Achievement v2 saja (bukan mutasi_weld)
}
// Set mode shift kerja part (Aturan #5)
export interface LKHShiftModePayload {
    date: string
    area: string
    part_number: string
    mode: LKHShiftMode
    scope: 'month' | 'date'   // month = seluruh periode; date = hanya tanggal ini
}

export interface LKHMutasiResponse {
    success:  boolean;
    message?: string;
    data:     LKHMutasiRow[];
    summary:  LKHMutasiSummary | null;
    meta:     LKHMutasiMeta;
}