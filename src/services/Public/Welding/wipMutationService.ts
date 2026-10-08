// services/Public/Welding/wipMutationService.ts
//
// Service untuk halaman "Mutasi WIP" (gaya/struktur sama dengan mutation.vue).
// Mirror dari mutasiService.ts, namun menunjuk ke controller backend
// `welding_wip_mutasi/*`. Yang dipanggil HANYA WIP yang diproses di
// MESIN BERBEDA dari FP-nya (mis. FP di ROBOT BARAT OP20, WIP OP10 di mesin
// berbeda → diplanningkan; bila OP10 di mesin yang sama → TIDAK). Aturan
// filter tersebut ditegakkan di backend; frontend hanya menampilkan hasil.

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
import type {
    MutasiSummary,
    MutasiMeta,
    MutasiResponse,
    CheckResponse,
    PlanActionResponse,
    LockStatusResponse,
    PlanLogResponse,
    BulkUnlockResponse,
} from '@/services/Public/Welding/mutasiService'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api'

/** Token login utk URL EventSource (SSE tak bisa kirim header Authorization). */
const streamToken = (): string => {
    const t = useAuthStore().token
    return t ? `&token=${encodeURIComponent(t)}` : ''
}
const ROOT = 'welding_wip_mutasi'

// Re-export tipe agar konsumen cukup import dari service ini.
export type {
    MutasiSummary,
    MutasiMeta,
    MutasiResponse,
    CheckResponse,
    PlanActionResponse,
    LockStatusResponse,
    PlanLogResponse,
    BulkUnlockResponse,
}

const wipMutationService = {

    // ── READ ──────────────────────────────────────────────────────
    async getMutasi(year: number, month: number, area_code: string): Promise<MutasiResponse> {
        const res = await axios.get(`${BASE_URL}/${ROOT}/mutasi`, {
            params: { year, month, area_code },
        })
        return res.data
    },

    async check(year: number, month: number, area_code: string): Promise<CheckResponse> {
        const res = await axios.get(`${BASE_URL}/${ROOT}/check`, {
            params: { year, month, area_code },
        })
        return res.data
    },

    // ── LOCK / UNLOCK ─────────────────────────────────────────────
    async lockPlan(payload: LockPlanPayload): Promise<PlanActionResponse> {
        const res = await axios.post(`${BASE_URL}/${ROOT}/lock_plan`, payload)
        return res.data
    },

    async resetPlan(payload: ResetPlanPayload): Promise<PlanActionResponse> {
        const res = await axios.post(`${BASE_URL}/${ROOT}/reset_plan`, payload)
        return res.data
    },

    // ── STATUS & LOG ──────────────────────────────────────────────
    async getLockStatus(year: number, month: number, area_code: string): Promise<LockStatusResponse> {
        const res = await axios.get(`${BASE_URL}/${ROOT}/lock_status`, {
            params: { year, month, area_code },
        })
        return res.data
    },

    async getPlanLog(
        year: number, month: number, area_code: string,
        part_number?: string, limit = 100,
    ): Promise<PlanLogResponse> {
        const res = await axios.get(`${BASE_URL}/${ROOT}/plan_log`, {
            params: { year, month, area_code, ...(part_number ? { part_number } : {}), limit },
        })
        return res.data
    },

    // ── BULK ──────────────────────────────────────────────────────
    async bulkUnlock(payload: BulkUnlockPayload): Promise<BulkUnlockResponse> {
        const res = await axios.post(`${BASE_URL}/${ROOT}/bulk_unlock`, payload)
        return res.data
    },

    getRefreshStreamUrl(year: number, month: number, area_code: string, v2 = false): string {
        return `${BASE_URL}/${ROOT}/refresh_stream?year=${year}&month=${month}&area_code=${encodeURIComponent(area_code)}${v2 ? '&v2=1' : ''}${streamToken()}`
    },

    getDownloadUrl(year: number, month: number, area_code: string): string {
        return `${BASE_URL}/${ROOT}/download?year=${year}&month=${month}&area_code=${encodeURIComponent(area_code)}`
    },

    getTemplateUrl(year: number, month: number, area_code: string): string {
        return `${BASE_URL}/${ROOT}/template?year=${year}&month=${month}&area_code=${encodeURIComponent(area_code)}`
    },

    getDownloadAllUrl(year: number, month: number): string {
        return `${BASE_URL}/${ROOT}/download_all?year=${year}&month=${month}`
    },

    async updateInitialStock(
        year: number, month: number, area_code: string,
        part_number: string, initial_stock: number,
    ): Promise<{ success: boolean; message?: string; data?: Job; meta?: Record<string, any> }> {
        const res = await axios.post(`${BASE_URL}/${ROOT}/update_initial_stock`, {
            year, month, area_code, part_number, initial_stock,
        })
        return res.data
    },

    async resetInitialStock(
        year: number, month: number, area_code: string, part_number: string,
    ): Promise<{ success: boolean; message?: string; data?: Job; meta?: Record<string, any> }> {
        const res = await axios.post(`${BASE_URL}/${ROOT}/reset_initial_stock`, {
            year, month, area_code, part_number,
        })
        return res.data
    },

    async adjustStock(
        year: number, month: number, area_code: string,
        part_number: string, tanggal: number,
        shift: 'day' | 'night', new_stock: number, note?: string,
    ): Promise<{ success: boolean; message?: string; data?: Job; rows_recalculated?: number; meta?: Record<string, any> }> {
        const res = await axios.post(`${BASE_URL}/${ROOT}/adjust_stock`, {
            year, month, area_code, part_number, tanggal, shift, new_stock,
            ...(note ? { note } : {}),
        })
        return res.data
    },

    async recalcPlan(year: number, month: number, area_code: string, v2 = false): Promise<MutasiResponse & { elapsed_ms?: number }> {
        const res = await axios.post(`${BASE_URL}/${ROOT}/recalc_plan`, {
            year, month, area_code, v2: v2 ? 1 : 0,
        })
        return res.data
    },

    async setShiftMode(
        year: number, month: number, area_code: string, part_number: string,
        mode: 'both' | 'day' | 'night', scope: 'month' | 'date' = 'month',
        tanggal?: number, v2 = false,
    ): Promise<MutasiResponse & { rows?: number }> {
        const res = await axios.post(`${BASE_URL}/${ROOT}/set_shift_mode`, {
            year, month, area_code, part_number, mode, scope, tanggal, v2: v2 ? 1 : 0,
        })
        return res.data
    },

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
        const res = await axios.post(`${BASE_URL}/${ROOT}/upload`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
    },
}

export default wipMutationService
