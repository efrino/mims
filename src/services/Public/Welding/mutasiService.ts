// services/Public/Welding/mutasiService.ts

import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import type {
    Job,
    LockRow,
    PlanLogEntry,
    PlanRowResponse,
    LockPlanPayload,
    ResetPlanPayload,
    BulkUnlockPayload,
} from '@/types/Public/Welding/planning'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api'

export interface PlanPatternPart {
    area_code: string
    part_number: string
    edits: number
    up: number
    down: number
    avg_delta: number
    avg_pct: number | null
    consistency: number
    top_reason: string | null
    reasons: Record<string, number>
    dn_pending_pct: number | null
    top_weekday: string | null
    avg_days_ahead: number | null
    shift: { day: number; night: number }
    planners: Record<string, number>
    last_at: string | null
    with_context: number
    pattern: string | null
}
export interface PlanPatternReport {
    from: number
    to: number
    total_edits: number
    reasons: Record<string, number>
    reason_labels: Record<string, string>
    parts: PlanPatternPart[]
}

/** Token login utk URL EventSource (SSE tak bisa kirim header Authorization). */
const streamToken = (): string => {
    const t = useAuthStore().token
    return t ? `&token=${encodeURIComponent(t)}` : ''
}

// ══════════════════════════════════════════════════════════════════
//  RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════

export interface MutasiSummary {
    total_mdfo: number | null
    total_dn: number | null
    total_dn_day: number | null
    total_dn_night: number | null
    total_plan_day: number | null
    total_plan_night: number | null
    total_actual_day: number | null
    total_actual_night: number | null
    total_actual: number | null
    total_balance_day: number | null
    total_balance_night: number | null
    avg_pcs_per_day: number | null
    avg_strength_actual: number | null
    total_parts: number
    total_locked_rows: number  // jumlah baris yang sedang di-lock
}

export interface MutasiMeta {
    year: number
    month: number
    area_code: string
    total_parts: number
    last_updated: string | null
    strength_unit: string
    pcs_per_day_basis: string
    holidays?: Record<string, string>
    // Aturan #7 — referensi TPT cap, dipakai panel kapasitas modal edit plan.
    tpt_cap_day_hours?: number
    tpt_cap_night_hours?: number
}

// ── Kompetisi Mesin (Aturan #7-lanjutan, part_type Aturan #13) ────
export interface MachineCompetitionPart {
    part_number: string
    part_name: string | null
    // Aturan #13 — 'FP' (mutasi_weld) atau 'WIP' (mutasi_wip). WIP tak punya
    // konsep DN/shift_mode/keterangan sendiri (demand turunan dari FP induk),
    // field itu diisi placeholder (dn 0, shift_mode 'both', note null) dari backend.
    part_type: 'FP' | 'WIP'
    qty_kbn: number
    uph: number
    shift_mode: 'both' | 'day' | 'night'
    dn_day: number
    dn_night: number
    plan_day: number
    plan_night: number
    hours_day: number
    hours_night: number
    pct_day: number
    pct_night: number
    day_note: string | null
    night_note: string | null
}

export interface MachineCompetitionData {
    machine: string
    tanggal: number
    cap_day_hours: number
    cap_night_hours: number
    total_hours_day: number
    total_hours_night: number
    total_pct_day: number
    total_pct_night: number
    parts: MachineCompetitionPart[]
}

export interface MachineCompetitionResponse {
    success: boolean
    message?: string
    data?: MachineCompetitionData
}

// ── Overview utilisasi semua mesin (dashboard grid) ───────────────
export interface MachineUtilizationRow {
    machine: string
    part_count: number
    // Aturan #13 — pecahan part_count per tipe, supaya grid bisa tampilkan
    // komposisi FP vs WIP per mesin (mesin bisa murni WIP, fp_part_count=0).
    fp_part_count: number
    wip_part_count: number
    hours_day: number
    hours_night: number
    // Aturan #8 — cap per-mesin dari master ms_welding_machine (fallback 11h/10h
    // bila mesin belum terdaftar di master).
    cap_day_hours: number
    cap_night_hours: number
    pct_day: number
    pct_night: number
}

export interface MachineUtilizationData {
    area_code: string
    tanggal: number
    cap_day_hours: number
    cap_night_hours: number
    machines: MachineUtilizationRow[]
}

export interface MachineUtilizationResponse {
    success: boolean
    message?: string
    data?: MachineUtilizationData
}

export interface MutasiResponse {
    success: boolean
    message?: string
    result?: string
    data: Job[]
    summary: MutasiSummary | null
    meta: MutasiMeta
}

export interface CheckResponse {
    success: boolean
    exists: boolean
    last_updated: string | null
}

// Response generic untuk lock/reset/unlock
export interface PlanActionResponse {
    success: boolean
    message: string
    data: PlanRowResponse | null
}

export interface LockStatusResponse {
    success: boolean
    data: LockRow[]
    total_locked: number
}

export interface PlanLogResponse {
    success: boolean
    data: PlanLogEntry[]
    total: number
}

export interface BulkUnlockResponse {
    success: boolean
    message: string
    rows_unlocked: number
}


// ══════════════════════════════════════════════════════════════════
//  SERVICE
// ══════════════════════════════════════════════════════════════════

const mutasiService = {

    // ── READ ──────────────────────────────────────────────────────

    /** Ambil data mutasi (pivot format untuk tabel frontend) */
    async getMutasi(year: number, month: number, area_code: string): Promise<MutasiResponse> {
        const res = await axios.get(`${BASE_URL}/welding_mutasi/mutasi`, {
            params: { year, month, area_code },
        })
        return res.data
    },

    /** Kompetisi mesin (Aturan #7-lanjutan) — semua part di 1 mesin/tanggal + % TPT-nya. */
    async getMachineCompetition(
        year: number, month: number, area_code: string, machine: string, tanggal: number
    ): Promise<MachineCompetitionResponse> {
        const res = await axios.get(`${BASE_URL}/welding_mutasi/machine_competition`, {
            params: { year, month, area_code, machine, tanggal },
        })
        return res.data
    },

    /** Overview utilisasi semua mesin di 1 area/tanggal (dashboard grid). */
    async getMachineUtilization(
        year: number, month: number, area_code: string, tanggal: number
    ): Promise<MachineUtilizationResponse> {
        const res = await axios.get(`${BASE_URL}/welding_mutasi/machine_utilization`, {
            params: { year, month, area_code, tanggal },
        })
        return res.data
    },

    /** Cek apakah data sudah ada untuk periode + area */
    async check(year: number, month: number, area_code: string): Promise<CheckResponse> {
        const res = await axios.get(`${BASE_URL}/welding_mutasi/check`, {
            params: { year, month, area_code },
        })
        return res.data
    },

    // ── LOCK / UNLOCK ─────────────────────────────────────────────

    /**
     * Lock atau unlock planning manual satu baris.
     *
     * Jika plan_day / plan_night disertakan → sekaligus ubah nilainya.
     * Jika lock=0 → hanya unlock, nilai tidak berubah.
     *
     * @example
     * // Lock shift night + ubah nilai
     * await mutasiService.lockPlan({
     *   year: 2026, month: 3, area_code: 'WSS_MTS',
     *   part_number: '57106-BZ240-00', tanggal: 15,
     *   shift: 'night', plan_night: 90, lock: 1,
     *   note: 'Overtime request'
     * })
     *
     * // Hanya unlock (tanpa ubah nilai)
     * await mutasiService.lockPlan({ ..., lock: 0 })
     */
    async lockPlan(payload: LockPlanPayload): Promise<PlanActionResponse> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/lock_plan`, payload)
        return res.data
    },

    /**
     * Reset planning ke nilai auto SP terakhir (plan_day_auto / plan_night_auto).
     * Sekaligus melepas lock pada shift yang direset.
     *
     * @example
     * await mutasiService.resetPlan({
     *   year: 2026, month: 3, area_code: 'WSS_MTS',
     *   part_number: '57106-BZ240-00', tanggal: 15, shift: 'both'
     * })
     */
    async resetPlan(payload: ResetPlanPayload): Promise<PlanActionResponse> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/reset_plan`, payload)
        return res.data
    },

    // ── STATUS & LOG ──────────────────────────────────────────────

    /**
     * Ambil semua baris yang sedang di-lock di periode + area.
     * Berguna untuk render badge/indicator di tabel.
     */
    async getLockStatus(
        year: number,
        month: number,
        area_code: string,
    ): Promise<LockStatusResponse> {
        const res = await axios.get(`${BASE_URL}/welding_mutasi/lock_status`, {
            params: { year, month, area_code },
        })
        return res.data
    },

    /**
     * Ambil riwayat perubahan planning manual.
     *
     * @param part_number  Filter by part (opsional)
     * @param limit        Max rows, default 100
     */
    // Pola adjust planner (langkah 2 belajar dari planner) — ringkasan plan_log manual.
    async getPlanPatterns(year: number, month: number, area_code?: string, months = 3): Promise<PlanPatternReport> {
        const res = await axios.get(`${BASE_URL}/welding_mutasi/plan_patterns`, {
            params: { year, month, months, ...(area_code ? { area_code } : {}) },
        })
        return res.data?.data
    },

    async getPlanLog(
        year: number,
        month: number,
        area_code: string,
        part_number?: string,
        limit = 100,
    ): Promise<PlanLogResponse> {
        const res = await axios.get(`${BASE_URL}/welding_mutasi/plan_log`, {
            params: {
                year, month, area_code,
                ...(part_number ? { part_number } : {}),
                limit,
            },
        })
        return res.data
    },

    // ── BULK ──────────────────────────────────────────────────────

    /**
     * Lepas semua lock di satu periode + area sekaligus.
     * Berguna sebelum full refresh agar SP bisa timpa semua planning.
     *
     * @param part_number  Opsional — jika diisi hanya unlock part tersebut
     */
    async bulkUnlock(payload: BulkUnlockPayload): Promise<BulkUnlockResponse> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/bulk_unlock`, payload)
        return res.data
    },

    /** Return URL SSE stream refresh — gunakan dengan EventSource. v2 = planning 2-baris */
    getRefreshStreamUrl(year: number, month: number, area_code: string, v2 = false): string {
        return `${BASE_URL}/welding_mutasi/refresh_stream?year=${year}&month=${month}&area_code=${encodeURIComponent(area_code)}${v2 ? '&v2=1' : ''}${streamToken()}`
    },

    /** Return URL download Excel — backend stream langsung, tidak perlu fetch */
    getDownloadUrl(year: number, month: number, area_code: string): string {
        return `${BASE_URL}/welding_mutasi/download?year=${year}&month=${month}&area_code=${encodeURIComponent(area_code)}`
    },

    /** Return URL template Excel untuk diisi user */
    getTemplateUrl(year: number, month: number, area_code: string): string {
        return `${BASE_URL}/welding_mutasi/template?year=${year}&month=${month}&area_code=${encodeURIComponent(area_code)}`
    },

    /** Return URL download Excel SEMUA area (1 file, 1 sheet per area) */
    getDownloadAllUrl(year: number, month: number): string {
        return `${BASE_URL}/welding_mutasi/download_all?year=${year}&month=${month}`
    },

    /**
     * Update initial stock satu part + re-run rolling hanya untuk part tersebut.
     * Returns job pivot terbaru untuk part tersebut.
     */
    async updateInitialStock(
        year: number, month: number, area_code: string,
        part_number: string, initial_stock: number,
    ): Promise<{ success: boolean; message?: string; data?: import('@/types/Public/Welding/planning').Job; meta?: Record<string, any> }> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/update_initial_stock`, {
            year, month, area_code, part_number, initial_stock,
        })
        return res.data
    },

    /**
     * Reset / unlock initial stock satu part kembali ke stok penutupan bulan lalu.
     * Melepas lock manual (lock_initial_stock=0), set initial_stock = stock_night
     * hari terakhir bulan sebelumnya (mutasi_weld), lalu rolling dihitung ulang.
     * Returns job pivot terbaru.
     */
    async resetInitialStock(
        year: number, month: number, area_code: string, part_number: string,
    ): Promise<{ success: boolean; message?: string; data?: import('@/types/Public/Welding/planning').Job; meta?: Record<string, any> }> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/reset_initial_stock`, {
            year, month, area_code, part_number,
        })
        return res.data
    },

    /**
     * Adjust stok aktual (stock_day / actual_stock) satu shift pada satu tanggal
     * + propagasi delta rolling ke depan tanpa mengubah actual produksi.
     */
    async adjustStock(
        year: number, month: number, area_code: string,
        part_number: string, tanggal: number,
        shift: 'day' | 'night', new_stock: number, note?: string,
    ): Promise<{ success: boolean; message?: string; data?: import('@/types/Public/Welding/planning').Job; rows_recalculated?: number; meta?: Record<string, any> }> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/adjust_stock`, {
            year, month, area_code, part_number, tanggal, shift, new_stock,
            ...(note ? { note } : {}),
        })
        return res.data
    },

    /**
     * Revert/undo koreksi stok satu shift pada satu tanggal (Aturan #19).
     * Backend menghapus flag koreksi lalu menghitung ulang dari data berjalan
     * (recalc_plan + reapply koreksi lain). Mengembalikan data SATU AREA penuh.
     */
    /** Adjust DN manual 1 sel (mode auto|manual|system). Plan ikut setelah refresh area. */
    async adjustDn(
        year: number, month: number, area_code: string, part_number: string, tanggal: number,
        shift: 'day' | 'night', manual_qty: number, mode: import('@/types/Public/Welding/planning').DnAdjustMode, note?: string,
    ): Promise<{ success: boolean; message?: string; effective?: number }> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/adjust_dn`, {
            year, month, area_code, part_number, tanggal, shift, manual_qty, mode,
            ...(note ? { note } : {}),
        })
        return res.data
    },

    /** Hapus adjust DN 1 sel → kembali ke DN sistem. */
    async resetDnAdjust(
        year: number, month: number, area_code: string, part_number: string, tanggal: number, shift: 'day' | 'night',
    ): Promise<{ success: boolean; message?: string }> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/reset_dn_adjust`, {
            year, month, area_code, part_number, tanggal, shift,
        })
        return res.data
    },

    async revertStockAdjust(
        year: number, month: number, area_code: string,
        part_number: string, tanggal: number, shift: 'day' | 'night',
    ): Promise<MutasiResponse & { elapsed_ms?: number; message?: string }> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/revert_stock_adjust`, {
            year, month, area_code, part_number, tanggal, shift,
        })
        return res.data
    },

    /**
     * Recalc planning ke depan + rolling final (tanpa full pipeline).
     * Dipanggil setelah adjustment agar plan ter-update tanpa Refresh penuh.
     * Mengembalikan data SATU AREA penuh (data: Job[]).
     */
    async recalcPlan(year: number, month: number, area_code: string, v2 = false): Promise<MutasiResponse & { elapsed_ms?: number }> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/recalc_plan`, {
            year, month, area_code, v2: v2 ? 1 : 0,
        })
        return res.data
    },

    /** Set mode shift kerja part (Aturan #5): both|day|night; scope month|date.
     *  Mengubah mutasi_weld.shift_mode + recalc plan; return data 1 area penuh. */
    async setShiftMode(
        year: number, month: number, area_code: string, part_number: string,
        mode: 'both' | 'day' | 'night', scope: 'month' | 'date' = 'month',
        tanggal?: number, v2 = false,
    ): Promise<MutasiResponse & { rows?: number }> {
        const res = await axios.post(`${BASE_URL}/welding_mutasi/set_shift_mode`, {
            year, month, area_code, part_number, mode, scope, tanggal, v2: v2 ? 1 : 0,
        })
        return res.data
    },

    /** Upload file template yang sudah diisi, return data terbaru */
    async uploadMutasi(year: number, month: number, area_code: string, file: File): Promise<MutasiResponse & {
        rows_updated: number
        rows_skipped: number
        rows_notfound: number
    }> {
        const form = new FormData()
        form.append('year', String(year))
        form.append('month', String(month))
        form.append('area_code', area_code)
        form.append('file', file)
        const res = await axios.post(`${BASE_URL}/welding_mutasi/upload`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
    },
}

export default mutasiService