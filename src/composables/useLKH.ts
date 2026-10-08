// composables/useLKH.ts
// LKH harian dari tabel lkh_weld — generate via SSE pipeline (native PHP)

import { ref, computed } from 'vue'
import { lkhService } from '@/services/Public/Welding/lkhService'
import type { LKHData, LKHSummary, LKHGenerateParams } from '@/types/Public/Welding/lkh'

// ── Pipeline stage type ────────────────────────────────────────
export interface PipelineStage {
    stage:       number
    title:       string
    status:      'pending' | 'running' | 'done' | 'error'
    rows_total?: number
    elapsed_ms?: number
    error?:      string
}

const STAGE_TITLES = [
    'Persiapan Data',
    'Part Master & Data DN',
    'Klasifikasi & Kalkulasi',
    'Validasi Total',
    'Insert Baris LKH',
    'Carryover Shift Sebelumnya',
    'Finalisasi & Ringkasan',
]

export function useLKH() {
    // ── State ─────────────────────────────────────────────────────
    const data      = ref<LKHData[]>([])
    const summary   = ref<LKHSummary | null>(null)
    const loading   = ref(false)
    const error     = ref<string | null>(null)
    const lastFetch = ref<string | null>(null)

    // ── Pipeline state ─────────────────────────────────────────────
    const pipeline        = ref<PipelineStage[]>([])
    const pipelineVisible = ref(false)
    const pipelineError   = ref<string | null>(null)

    // ── Derived ───────────────────────────────────────────────────
    const hasData = computed(() => data.value.length > 0)

    const lastUpdatedLabel = computed(() => {
        if (!lastFetch.value) return null
        return new Date(lastFetch.value).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    })

    const headerStats = computed(() => {
        const s = summary.value
        const d = data.value
        return {
            totalJobs:         s?.total_jobs          ?? d.length,
            totalFP:           s?.total_fp            ?? d.filter(r => r.status_plan === 'FP').length,
            totalPreview:      s?.total_preview        ?? d.filter(r => r.status_plan === 'PREVIEW').length,
            totalCarryover:    s?.carryover_count      ?? d.filter(r => r.status_plan === 'CARRYOVER').length,
            totalPatanStroke:  s?.total_patan_stroke   ?? 0,
            totalCutoffStroke: s?.total_cutoff_stroke  ?? 0,
        }
    })

    // ── Actions ───────────────────────────────────────────────────

    /** Ambil data LKH yang sudah ada (tanpa generate ulang) */
    const fetchLKH = async (params: LKHGenerateParams): Promise<boolean> => {
        loading.value = true
        error.value   = null
        try {
            const res = await lkhService.getLKH(params)
            if (res.success) {
                data.value      = res.data ?? []
                summary.value   = res.summary
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

    /** Inisialisasi overlay pipeline */
    const _initPipeline = () => {
        pipeline.value = STAGE_TITLES.map((title, i) => ({
            stage:  i + 1,
            title,
            status: 'pending' as const,
        }))
        pipelineVisible.value = true
        pipelineError.value   = null
    }

    /** Tutup overlay pipeline */
    const closePipeline = () => {
        pipelineVisible.value = false
    }

    /**
     * Generate LKH via SSE pipeline — jalankan 7-stage native PHP pipeline.
     * Menampilkan progress overlay real-time, update data setelah selesai.
     */
    const generateLKH = async (params: LKHGenerateParams): Promise<boolean> => {
        loading.value = true
        error.value   = null
        _initPipeline()

        return new Promise<boolean>((resolve) => {
            let resolved = false

            const url = lkhService.getGenerateStreamURL(params)
            const es  = new EventSource(url)

            const finish = (ok: boolean) => {
                if (resolved) return
                resolved      = true
                loading.value = false
                es.close()
                resolve(ok)
            }

            es.addEventListener('stage_start', (e: MessageEvent) => {
                const d = JSON.parse(e.data)
                const stage = pipeline.value.find(s => s.stage === d.stage)
                if (stage) stage.status = 'running'
            })

            es.addEventListener('stage_done', (e: MessageEvent) => {
                const d = JSON.parse(e.data)
                const stage = pipeline.value.find(s => s.stage === d.stage)
                if (stage) {
                    stage.status     = 'done'
                    stage.rows_total = d.rows_total ?? undefined
                    stage.elapsed_ms = d.elapsed_ms !== undefined ? Math.round(d.elapsed_ms) : undefined
                }
            })

            es.addEventListener('stage_error', (e: MessageEvent) => {
                const d = JSON.parse(e.data)
                const stage = pipeline.value.find(s => s.stage === d.stage)
                if (stage) {
                    stage.status = 'error'
                    stage.error  = d.message
                }
                pipelineError.value = d.message
            })

            es.addEventListener('done', (e: MessageEvent) => {
                const d = JSON.parse(e.data)
                data.value      = d.data    ?? []
                summary.value   = d.summary ?? null
                lastFetch.value = new Date().toISOString()
                // Auto-close overlay after brief pause so user sees completion
                setTimeout(() => { pipelineVisible.value = false }, 1600)
                finish(true)
            })

            // Server-sent application error  OR  browser connection error
            es.addEventListener('error', (e: Event) => {
                if (resolved) return
                const me = e as MessageEvent
                let msg = 'Generate LKH gagal'
                if (me.data) {
                    try { msg = JSON.parse(me.data).message ?? msg } catch { /**/ }
                    error.value         = msg
                    pipelineError.value = msg
                    finish(false)
                } else {
                    // Connection-level error — only act if still open
                    if (es.readyState === EventSource.CLOSED) return
                    msg                 = 'Koneksi SSE terputus'
                    error.value         = msg
                    pipelineError.value = msg
                    finish(false)
                }
            })
        })
    }

    /** Update kolom Actual Prod (lot_size, pjk, tpt) lalu sinkron lokal */
    const updateActual = async (params: {
        id:              number
        actual_lot_size: string | null
        actual_pjk:      string | null
        actual_tpt:      string | null
    }): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await lkhService.updateActual(params.id, {
                actual_lot_size: params.actual_lot_size,
                actual_pjk:      params.actual_pjk,
                actual_tpt:      params.actual_tpt,
            })
            if (res.success) {
                const row = data.value.find(r => r.id === params.id)
                if (row) {
                    row.actual_lot_size = params.actual_lot_size
                    row.actual_pjk      = params.actual_pjk
                    row.actual_tpt      = params.actual_tpt
                }
            }
            return { success: res.success, message: res.message }
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? e?.message ?? 'Gagal update actual' }
        }
    }

    /** Update keterangan lalu sinkron lokal */
    const updateKeterangan = async (id: number, keterangan: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await lkhService.updateRemarks(id, keterangan)
            if (res.success) {
                const row = data.value.find(r => r.id === id)
                if (row) row.keterangan = keterangan
            }
            return { success: res.success, message: res.message }
        } catch (e: any) {
            return { success: false, message: e?.message ?? 'Gagal update keterangan' }
        }
    }

    const reset = () => {
        data.value            = []
        summary.value         = null
        error.value           = null
        lastFetch.value       = null
        pipeline.value        = []
        pipelineVisible.value = false
        pipelineError.value   = null
    }

    return {
        // State
        data, summary, loading, error, lastFetch,
        // Pipeline
        pipeline, pipelineVisible, pipelineError,
        // Derived
        hasData, headerStats, lastUpdatedLabel,
        // Actions
        fetchLKH, generateLKH, updateActual, updateKeterangan,
        closePipeline, reset,
    }
}
