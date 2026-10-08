// composables/useMutasiLKH.ts
// LKH harian yang membaca langsung dari mutasi_weld (planning pipeline)

import { ref, computed } from 'vue'
import { lkhService } from '@/services/Public/Welding/lkhService'
import type { LKHMutasiRow, LKHMutasiSummary, LKHMutasiParams } from '@/types/Public/Welding/lkh'

export function useMutasiLKH() {
    // ── State ─────────────────────────────────────────────────────
    const data      = ref<LKHMutasiRow[]>([])
    const summary   = ref<LKHMutasiSummary | null>(null)
    const loading   = ref(false)
    const error     = ref<string | null>(null)
    const lastFetch = ref<string | null>(null)   // ISO timestamp

    // ── Derived ───────────────────────────────────────────────────
    const hasData    = computed(() => data.value.length > 0)
    const isTentative = computed(() => (summary.value?.no_dn_count ?? 0) > 0)
    const isFix       = computed(() => !isTentative.value && hasData.value)

    /** Stats untuk LKHHeader */
    const headerStats = computed(() => {
        const s = summary.value
        return {
            totalJobs:        s?.total_parts  ?? 0,
            totalFP:          s?.dn_count     ?? 0,
            totalPreview:     s?.no_dn_count  ?? 0,
            totalCarryover:   0,
            totalPlan:        s?.total_plan   ?? 0,
            totalDN:          s?.total_dn     ?? 0,
            totalActual:      s?.total_actual ?? 0,
        }
    })

    const lastUpdatedLabel = computed(() => {
        if (!lastFetch.value) return null
        return new Date(lastFetch.value).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    })

    // ── Actions ───────────────────────────────────────────────────

    /** Muat data LKH harian dari mutasi_weld */
    const fetchLKH = async (params: LKHMutasiParams): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const res = await lkhService.getMutasiLKH(params)
            if (res.success) {
                // PHP/MySQL mengembalikan angka sebagai string — normalisasi ke number
                data.value = (res.data ?? []).map(r => ({
                    ...r,
                    qty_kbn:       Number(r.qty_kbn)       || 0,
                    pcs_per_day:   Number(r.pcs_per_day)   || 0,
                    initial_stock: Number(r.initial_stock) || 0,
                    dn:            Number(r.dn)            || 0,
                    plan:          Number(r.plan)          || 0,
                    actual:        Number(r.actual)        || 0,
                    lock_actual:   Number(r.lock_actual)   || 0,
                    status_part:   (r.status_part === 'FP' ? 'FP' : 'WIP') as 'FP' | 'WIP',
                    balance:       Number(r.balance)       || 0,
                    stock:         Number(r.stock)         || 0,
                    strength:      Number(r.strength)      || 0,
                    keterangan:    r.keterangan ?? null,
                }))
                summary.value = res.summary
                    ? {
                        total_parts:  Number(res.summary.total_parts)  || 0,
                        total_plan:   Number(res.summary.total_plan)   || 0,
                        total_dn:     Number(res.summary.total_dn)     || 0,
                        total_actual: Number(res.summary.total_actual) || 0,
                        dn_count:     Number(res.summary.dn_count)     || 0,
                        no_dn_count:  Number(res.summary.no_dn_count)  || 0,
                    }
                    : null
                lastFetch.value = new Date().toISOString()
                return true
            } else {
                error.value = res.message ?? 'Gagal memuat data'
                data.value  = []
                return false
            }
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan'
            data.value  = []
            return false
        } finally {
            loading.value = false
        }
    }

    /** Update keterangan secara lokal (client-side only) */
    const updateKeterangan = (partNumber: string, keterangan: string) => {
        const row = data.value.find(r => r.part_number === partNumber)
        if (row) row.keterangan = keterangan
    }

    /** Update actual_day / actual_night di mutasi_weld lalu sinkron ke lokal */
    const updateActual = async (params: {
        partNumber:  string;
        area:        string;
        date:        string;
        shift:       1 | 2;
        actual:      number;
    }): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await lkhService.updateLKHActual({
                part_number: params.partNumber,
                area:        params.area,
                date:        params.date,
                shift:       params.shift,
                actual:      params.actual,
            })
            if (res.success) {
                // Sinkron nilai lokal supaya display langsung update tanpa re-fetch
                const row = data.value.find(r => r.part_number === params.partNumber)
                if (row) {
                    row.actual      = params.actual
                    row.lock_actual = 1   // aktifkan indikator lock di UI
                }
                // Perbarui summary
                if (summary.value) {
                    summary.value.total_actual = data.value.reduce(
                        (s, r) => s + (Number(r.actual) || 0), 0
                    )
                }
            }
            return res
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? e?.message ?? 'Gagal update actual' }
        }
    }

    /** Lepas lock sehingga pipeline bisa kembali menghitung actual otomatis */
    const unlockActual = async (params: {
        partNumber: string;
        area:       string;
        date:       string;
        shift:      1 | 2;
    }): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await lkhService.unlockLKHActual({
                part_number: params.partNumber,
                area:        params.area,
                date:        params.date,
                shift:       params.shift,
            })
            if (res.success) {
                // Hapus indikator lock di lokal (nilai actual tetap sampai pipeline jalan)
                const row = data.value.find(r => r.part_number === params.partNumber)
                if (row) row.lock_actual = 0
            }
            return res
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? e?.message ?? 'Gagal unlock actual' }
        }
    }

    const reset = () => {
        data.value      = []
        summary.value   = null
        error.value     = null
        lastFetch.value = null
    }

    return {
        // State
        data, summary, loading, error, lastFetch,
        // Derived
        hasData, isTentative, isFix, headerStats, lastUpdatedLabel,
        // Actions
        fetchLKH, updateKeterangan, updateActual, unlockActual, reset,
    }
}
