// composables/usePlanLock.ts

import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type {
    Job,
    DateData,
    LockPlanPayload,
    ResetPlanPayload,
    BulkUnlockPayload,
    PlanRowResponse,
    ShiftTarget,
    PlanReasonCode,
} from '@/types/Public/Welding/planning'
import mutasiService from '@/services/Public/Welding/mutasiService'

// Service apa pun yang menyediakan lock/reset/bulk-unlock (mutasiService FP atau
// wipMutationService WIP) bisa di-inject agar composable lock dipakai ulang.
export interface PlanLockService {
    lockPlan: typeof mutasiService.lockPlan
    resetPlan: typeof mutasiService.resetPlan
    bulkUnlock: typeof mutasiService.bulkUnlock
}

// ── Context yang dikirim saat user klik cell PLAN ────────────────
export interface PlanEditContext {
    partNo: string
    partName: string
    tanggal: number
    year: number
    month: number
    areaCode: string
    dateData: DateData  // data cell saat ini (values + lock state)
    // Aturan #7 — panel kapasitas (mesin/UPH/shift mode/TPT cap), opsional.
    machine?: string | null
    uph?: number | null
    shiftMode?: 'both' | 'day' | 'night'
    tptCapDayHours?: number
    tptCapNightHours?: number
    qtyKbn?: number
}

// ── Bentuk form yang dikirim dari PlanEditModal ──────────────────
export interface PlanEditFormData {
    plan_day: number | null
    plan_night: number | null
    lock_day: boolean
    lock_night: boolean
    note: string
    reason: PlanReasonCode | null
}

export function usePlanLock(jobs: Ref<Job[]>, service: PlanLockService = mutasiService) {
    const editModal = ref<{ open: boolean; ctx: PlanEditContext | null }>({ open: false, ctx: null })
    const submitting = ref(false)
    const bulkUnlocking = ref(false)
    const lockError = ref<string | null>(null)

    // ── Modal open / close ────────────────────────────────────────
    function openEditModal(ctx: PlanEditContext) {
        editModal.value = { open: true, ctx: { ...ctx, dateData: { ...ctx.dateData } } }
        lockError.value = null
    }

    function closeEditModal() {
        editModal.value = { open: false, ctx: null }
        lockError.value = null
    }

    // ── Reactive update satu baris PLAN di jobs ───────────────────
    function _applyRow(partNo: string, tanggal: number, data: PlanRowResponse) {
        const job = jobs.value.find(j => j.partNo === partNo)
        if (!job) return
        const planDesc = job.descriptions.find(d => d.type === 'PLAN')
        if (!planDesc) return

        const existing = planDesc.dates[tanggal] ?? {}
        planDesc.dates[tanggal] = {
            ...existing,
            day: data.plan_day,
            night: data.plan_night,
            lock_day: data.lock_plan_day,
            lock_night: data.lock_plan_night,
            plan_day_auto: data.plan_day_auto,
            plan_night_auto: data.plan_night_auto,
            locked_by: data.locked_by,
            locked_at: data.locked_at,
            lock_note: data.lock_note,
        }

        // Recalculate row total
        planDesc.total = Object.values(planDesc.dates).reduce(
            (s, d) => s + (d.day ?? 0) + (d.night ?? 0), 0
        )
    }

    async function _callLockApi(payload: LockPlanPayload): Promise<void> {
        const res = await service.lockPlan(payload)
        if (!res.success) throw new Error(res.message)
        if (res.data) _applyRow(payload.part_number, payload.tanggal, res.data)
    }

    // ── Handle submit dari PlanEditModal ──────────────────────────
    //  • lock_day === lock_night → 1 call shift='both'
    //  • lock berbeda per shift  → 2 call: shift='day' lalu shift='night'
    //
    async function handleModalSubmit(
        ctx: PlanEditContext,
        form: PlanEditFormData
    ): Promise<boolean> {
        submitting.value = true
        lockError.value = null

        const base = {
            year: ctx.year,
            month: ctx.month,
            area_code: ctx.areaCode,
            part_number: ctx.partNo,
            tanggal: ctx.tanggal,
            note: form.note?.trim() || null,
            reason: form.reason,
        }

        try {
            if (form.lock_day === form.lock_night) {
                await _callLockApi({
                    ...base,
                    shift: 'both',
                    plan_day: form.plan_day,
                    plan_night: form.plan_night,
                    lock: form.lock_day ? 1 : 0,
                })
            } else {
                // Dua call — day dulu, night kemudian
                await _callLockApi({
                    ...base, shift: 'day',
                    plan_day: form.plan_day, plan_night: null,
                    lock: form.lock_day ? 1 : 0,
                })
                await _callLockApi({
                    ...base, shift: 'night',
                    plan_day: null, plan_night: form.plan_night,
                    lock: form.lock_night ? 1 : 0,
                })
            }

            closeEditModal()
            return true
        } catch (e: any) {
            lockError.value = e?.response?.data?.message ?? e?.message ?? 'Gagal menyimpan perubahan'
            return false
        } finally {
            submitting.value = false
        }
    }

    // ── Reset ke nilai auto SP ────────────────────────────────────
    async function submitResetPlan(
        ctx: PlanEditContext,
        shift: ShiftTarget
    ): Promise<boolean> {
        submitting.value = true
        lockError.value = null
        try {
            const res = await service.resetPlan({
                year: ctx.year, month: ctx.month,
                area_code: ctx.areaCode, part_number: ctx.partNo,
                tanggal: ctx.tanggal, shift,
            })
            if (!res.success) throw new Error(res.message)
            if (res.data) _applyRow(ctx.partNo, ctx.tanggal, res.data)
            return true
        } catch (e: any) {
            lockError.value = e?.response?.data?.message ?? e?.message ?? 'Gagal reset ke auto'
            return false
        } finally {
            submitting.value = false
        }
    }

    // ── Bulk unlock ───────────────────────────────────────────────
    async function submitBulkUnlock(
        payload: BulkUnlockPayload
    ): Promise<{ success: boolean; rows: number }> {
        bulkUnlocking.value = true
        lockError.value = null
        try {
            const res = await service.bulkUnlock(payload)
            if (!res.success) throw new Error(res.message)

            // Clear semua lock state di client
            jobs.value.forEach(job => {
                if (payload.part_number && job.partNo !== payload.part_number) return
                const planDesc = job.descriptions.find(d => d.type === 'PLAN')
                if (!planDesc) return
                Object.values(planDesc.dates).forEach(d => {
                    d.lock_day = false; d.lock_night = false
                    d.locked_by = null; d.locked_at = null; d.lock_note = null
                })
            })

            return { success: true, rows: res.rows_unlocked }
        } catch (e: any) {
            lockError.value = e?.response?.data?.message ?? e?.message ?? 'Gagal bulk unlock'
            return { success: false, rows: 0 }
        } finally {
            bulkUnlocking.value = false
        }
    }

    // ── Hitung jumlah baris yang sedang di-lock ───────────────────
    const countLocked = computed(() => {
        let n = 0
        jobs.value.forEach(job => {
            const planDesc = job.descriptions.find(d => d.type === 'PLAN')
            if (!planDesc) return
            Object.values(planDesc.dates).forEach(d => {
                if (d.lock_day || d.lock_night) n++
            })
        })
        return n
    })

    return {
        editModal,
        submitting,
        bulkUnlocking,
        lockError,
        countLocked,
        openEditModal,
        closeEditModal,
        handleModalSubmit,
        submitResetPlan,
        submitBulkUnlock,
    }
}
