// composables/useWipMutationData.ts
//
// Versi WIP dari useMutationData — struktur & perilaku identik, namun memakai
// wipMutationService (endpoint welding_wip_mutasi/*). Dipakai oleh halaman
// "Mutasi WIP" yang bergaya sama dengan mutation.vue.

import { ref, computed, watch } from 'vue'
import type { Job } from '@/types/Public/Welding/planning'
import { tagKind, tagKinds } from '@/utils/mutasiKind'
import { useWeldingAreas } from '@/composables/useWeldingAreas'
import wipMutationService, {
    type MutasiSummary,
    type MutasiMeta,
} from '@/services/Public/Welding/wipMutationService'

export function useWipMutationData(initialAreaCode: string = 'SA ADM') {
    const jobs = ref<Job[]>([])
    const summary = ref<MutasiSummary | null>(null)
    const meta = ref<MutasiMeta | null>(null)
    const loading = ref(false)
    const refreshing = ref(false)
    const error = ref<string | null>(null)

    const selectedYear = ref(new Date().getFullYear())
    const selectedMonth = ref(new Date().getMonth() + 1)
    const areaCode = ref(initialAreaCode)

    // areaCode bisa kode area MASTER gabungan (lihat useMutationData): baca di-expand
    // backend, tulis per part pakai zone asli dari job.areaCode.
    const { zonesOf } = useWeldingAreas()
    const zoneOf = (part_number: string): string =>
        jobs.value.find(j => j.partNo === part_number)?.areaCode || areaCode.value
    const isMergedArea = computed(() => zonesOf(areaCode.value).length > 1)

    // ================================================================
    // FETCH DATA
    // ================================================================
    // Token anti-race: respons fetch lama tak boleh menimpa fetch baru (pindah area/periode).
    let fetchSeq = 0

    const fetchMutasi = async () => {
        const seq = ++fetchSeq
        loading.value = true
        error.value = null
        try {
            const res = await wipMutationService.getMutasi(
                selectedYear.value, selectedMonth.value, areaCode.value,
            )
            if (seq !== fetchSeq) return
            if (!res.success) throw new Error(res.message ?? 'Gagal mengambil data')
            jobs.value = tagKinds(res.data, 'WIP')
            summary.value = res.summary ?? null
            meta.value = res.meta ?? null
        } catch (e: any) {
            if (seq !== fetchSeq) return
            error.value = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan'
            jobs.value = []
        } finally {
            if (seq === fetchSeq) loading.value = false
        }
    }

    // ================================================================
    // SILENT FETCH — re-fetch tanpa loading overlay (untuk socket realtime)
    // ================================================================
    const silentFetch = async () => {
        const seq = ++fetchSeq
        try {
            const res = await wipMutationService.getMutasi(
                selectedYear.value, selectedMonth.value, areaCode.value,
            )
            if (seq !== fetchSeq || !res.success) return
            jobs.value    = tagKinds(res.data, 'WIP')
            summary.value = res.summary ?? null
            meta.value    = res.meta    ?? null
        } catch { /* silent */ }
    }

    // ================================================================
    // REFRESH — SSE stream pipeline (sama dgn mutation, untuk WIP)
    // ================================================================
    const refreshMessage = ref<string | null>(null)

    // Area mesin welding yang relevan untuk WIP (mesin proktur OP).
    // Daftar zone welding aktif (Refresh semua area) — dari master Area & Mesin.
    const { zones: WELDING_AREAS, load: loadWeldingAreas } = useWeldingAreas()

    const _runRefreshStream = (
        area: string,
        prefix = '',
    ): Promise<{ success: boolean; done?: any; message: string }> => {
        return new Promise((resolve) => {
            refreshMessage.value = `${prefix}Menghubungkan ke pipeline...`
            const url = wipMutationService.getRefreshStreamUrl(
                selectedYear.value, selectedMonth.value, area, planningV2.value,
            )
            const es = new EventSource(url)
            let settled = false
            const settle = (r: { success: boolean; done?: any; message: string }) => {
                if (settled) return; settled = true; es.close(); resolve(r)
            }
            es.addEventListener('stage_start',    (e) => { refreshMessage.value = prefix + JSON.parse((e as MessageEvent).data).title + '...' })
            es.addEventListener('stage_progress', (e) => { const d = JSON.parse((e as MessageEvent).data); refreshMessage.value = prefix + (d.detail || d.step_label + '...') })
            es.addEventListener('stage_done',     (e) => { refreshMessage.value = prefix + JSON.parse((e as MessageEvent).data).title + ' ✓' })
            es.addEventListener('stage_error',    (e) => { const d = JSON.parse((e as MessageEvent).data); settle({ success: false, message: d.message }) })
            es.addEventListener('done',           (e) => { settle({ success: true, done: JSON.parse((e as MessageEvent).data), message: 'ok' }) })
            es.addEventListener('error',          (e) => {
                if (settled) return
                const me = e as MessageEvent
                let msg = 'Koneksi SSE terputus'
                try { if (me.data) msg = JSON.parse(me.data).message ?? msg } catch { /* ignore */ }
                settle({ success: false, message: msg })
            })
        })
    }

    const refreshMutasi = async (): Promise<{ success: boolean; message: string }> => {
        refreshing.value = true
        error.value = null
        try {
            const r = await _runRefreshStream(areaCode.value)
            if (!r.success) { error.value = r.message; refreshMessage.value = null; return { success: false, message: r.message } }

            refreshMessage.value = 'Memuat data hasil pipeline...'
            const res = await wipMutationService.getMutasi(selectedYear.value, selectedMonth.value, areaCode.value)
            if (!res.success) throw new Error(res.message ?? 'Gagal mengambil data')
            jobs.value = tagKinds(res.data, 'WIP'); summary.value = res.summary ?? null; meta.value = res.meta ?? null

            const d = r.done ?? {}
            const restoredMsg = d.stock_restored > 0 ? ` · ${d.stock_restored} koreksi stok dipulihkan` : ''
            let topMsg = ''
            if (Array.isArray(d.timings) && d.timings.length) {
                try { console.table(d.timings) } catch { /* ignore */ }
                // detail step terberat cukup di console.table — jangan penuhi status bar
            }
            refreshMessage.value = `Selesai dalam ${d.elapsed_s} detik${restoredMsg}${topMsg}`
            setTimeout(() => { refreshMessage.value = null }, 4000)
            return { success: true, message: `Refresh selesai dalam ${d.elapsed_s} detik${restoredMsg}` }
        } catch (e2: any) {
            const msg = e2?.message ?? 'Gagal memuat data setelah pipeline'
            error.value = msg; refreshMessage.value = null
            return { success: false, message: msg }
        } finally {
            refreshing.value = false
        }
    }

    const refreshAllAreas = async (): Promise<{ success: boolean; message: string }> => {
        refreshing.value = true
        error.value = null
        await loadWeldingAreas()
        const areas = WELDING_AREAS.value
        const total = areas.length
        const failed: string[] = []
        let activeAreaLoaded = false
        try {
            for (let i = 0; i < total; i++) {
                const area = areas[i]
                const r = await _runRefreshStream(area, `[${i + 1}/${total}] ${area} — `)
                if (!r.success) {
                    failed.push(area)
                } else if (zonesOf(areaCode.value).includes(area)) {
                    refreshMessage.value = `[${i + 1}/${total}] Memuat data ${area}...`
                    try {
                        const res = await wipMutationService.getMutasi(selectedYear.value, selectedMonth.value, areaCode.value)
                        if (res.success) {
                            jobs.value = tagKinds(res.data, 'WIP')
                            summary.value = res.summary ?? null
                            meta.value = res.meta ?? null
                            activeAreaLoaded = true
                        }
                    } catch { /* non-fatal */ }
                }
            }
            if (!activeAreaLoaded) {
                refreshMessage.value = 'Memuat data area aktif...'
                const res = await wipMutationService.getMutasi(selectedYear.value, selectedMonth.value, areaCode.value)
                if (res.success) { jobs.value = tagKinds(res.data, 'WIP'); summary.value = res.summary ?? null; meta.value = res.meta ?? null }
            }

            const okCount = total - failed.length
            const msg = failed.length
                ? `Refresh semua area: ${okCount}/${total} sukses, gagal: ${failed.join(', ')}`
                : `Refresh semua area selesai (${total} area)`
            refreshMessage.value = msg
            setTimeout(() => { refreshMessage.value = null }, 6000)
            return { success: failed.length === 0, message: msg }
        } catch (e2: any) {
            const msg = e2?.message ?? 'Gagal refresh semua area'
            error.value = msg; refreshMessage.value = null
            return { success: false, message: msg }
        } finally {
            refreshing.value = false
        }
    }

    // ================================================================
    // DOWNLOAD / TEMPLATE
    // ================================================================
    const _openTab = (url: string) => { window.open(url, '_blank', 'noopener') }
    const downloadMutasi = () => { _openTab(wipMutationService.getDownloadUrl(selectedYear.value, selectedMonth.value, areaCode.value)) }
    const downloadAllAreas = () => { _openTab(wipMutationService.getDownloadAllUrl(selectedYear.value, selectedMonth.value)) }
    const downloadTemplate = () => { _openTab(wipMutationService.getTemplateUrl(selectedYear.value, selectedMonth.value, areaCode.value)) }

    // ================================================================
    // UPLOAD
    // ================================================================
    const uploading = ref(false)
    const uploadError = ref<string | null>(null)
    const uploadMutasi = async (file: File) => {
        uploading.value = true
        uploadError.value = null
        try {
            const res = await wipMutationService.uploadMutasi(selectedYear.value, selectedMonth.value, areaCode.value, file)
            if (!res.success) throw new Error((res as any).message ?? 'Upload gagal')
            jobs.value    = tagKinds(res.data, 'WIP')
            summary.value = res.summary ?? null
            meta.value    = res.meta ?? null
            return { success: true, message: (res as any).message, rows_updated: res.rows_updated, rows_skipped: res.rows_skipped }
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan saat upload'
            uploadError.value = msg
            return { success: false, message: msg }
        } finally {
            uploading.value = false
        }
    }

    // ================================================================
    // INITIAL STOCK update / reset
    // ================================================================
    const updatingStock = ref(false)
    const updateInitialStock = async (part_number: string, initial_stock: number) => {
        updatingStock.value = true
        try {
            const res = await wipMutationService.updateInitialStock(
                selectedYear.value, selectedMonth.value, zoneOf(part_number), part_number, initial_stock,
            )
            if (!res.success) throw new Error(res.message ?? 'Gagal update initial stock')
            if (res.data) {
                const idx = jobs.value.findIndex(j => j.partNo === part_number)
                if (idx !== -1) jobs.value[idx] = tagKind(res.data, 'WIP')
            }
            return { success: true, data: res.data }
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan' }
        } finally {
            updatingStock.value = false
        }
    }

    const unlockInitialStock = async (part_number: string) => {
        updatingStock.value = true
        try {
            const res = await wipMutationService.resetInitialStock(
                selectedYear.value, selectedMonth.value, zoneOf(part_number), part_number,
            )
            if (!res.success) throw new Error(res.message ?? 'Gagal reset initial stock')
            if (res.data) {
                const idx = jobs.value.findIndex(j => j.partNo === part_number)
                if (idx !== -1) jobs.value[idx] = tagKind(res.data, 'WIP')
            }
            return { success: true, data: res.data, meta: res.meta }
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan' }
        } finally {
            updatingStock.value = false
        }
    }

    // ================================================================
    // ADJUST ACTUAL STOCK
    // ================================================================
    const adjustingStock = ref(false)
    const adjustStock = async (params: {
        part_number: string
        tanggal: number
        shift: 'day' | 'night'
        new_stock: number
        note?: string
    }) => {
        adjustingStock.value = true
        try {
            const res = await wipMutationService.adjustStock(
                selectedYear.value, selectedMonth.value, zoneOf(params.part_number),
                params.part_number, params.tanggal, params.shift, params.new_stock, params.note,
            )
            if (!res.success) throw new Error(res.message ?? 'Adjust stok gagal')
            if (res.data) {
                const idx = jobs.value.findIndex(j => j.partNo === params.part_number)
                if (idx !== -1) jobs.value[idx] = tagKind(res.data, 'WIP')
            }
            return { success: true, message: res.message ?? 'Stok diperbarui dan rolling dihitung ulang' }
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan saat adjust stok' }
        } finally {
            adjustingStock.value = false
        }
    }

    // Revert koreksi stok (Aturan #19) baru tersedia utk Mutasi FP. WIP belum
    // punya endpoint-nya — stub ini menjaga bentuk API sama dgn useMutationData
    // supaya halaman unified bisa memakai `current` tanpa percabangan tipe.
    const revertingStock = ref(false)
    const revertStockAdjust = async (_params: { part_number: string; tanggal: number; shift: 'day' | 'night' }) => {
        return { success: false, message: 'Revert koreksi stok belum tersedia untuk Mutasi WIP.' }
    }

    // ================================================================
    // RECALC PLANNING + SHIFT MODE
    // ================================================================
    const recalculating = ref(false)
    const planningV2 = ref(localStorage.getItem('welding_wip_planning_v2') === '1')
    watch(planningV2, (v) => localStorage.setItem('welding_wip_planning_v2', v ? '1' : '0'))

    const settingShiftMode = ref(false)
    const setShiftMode = async (
        part_number: string,
        mode: 'both' | 'day' | 'night',
        scope: 'month' | 'date' = 'month',
        tanggal?: number,
    ) => {
        settingShiftMode.value = true
        try {
            const res = await wipMutationService.setShiftMode(
                selectedYear.value, selectedMonth.value, zoneOf(part_number),
                part_number, mode, scope, tanggal, planningV2.value,
            )
            if (res.success && isMergedArea.value) await silentFetch()
            else if (res.success && Array.isArray(res.data)) {
                jobs.value    = tagKinds(res.data, 'WIP')
                summary.value = res.summary ?? summary.value
                meta.value    = res.meta ?? meta.value
            }
            return { success: !!res.success, message: (res as any).message }
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? e?.message }
        } finally {
            settingShiftMode.value = false
        }
    }

    const recalcPlanning = async () => {
        recalculating.value = true
        try {
            const zones = zonesOf(areaCode.value)
            let last: any = null
            for (const z of zones) {
                last = await wipMutationService.recalcPlan(selectedYear.value, selectedMonth.value, z, planningV2.value)
                if (!last?.success) return { success: false, message: last?.message }
            }
            if (zones.length > 1) await silentFetch()
            else if (last?.success && Array.isArray(last.data)) {
                jobs.value    = tagKinds(last.data, 'WIP')
                summary.value = last.summary ?? summary.value
                meta.value    = last.meta ?? meta.value
            }
            return { success: true }
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message ?? e?.message }
        } finally {
            recalculating.value = false
        }
    }


    // ================================================================
    // PERIOD CHANGE
    // ================================================================
    const onPeriodChange = async (data: { month: number; year: number }) => {
        selectedMonth.value = data.month
        selectedYear.value = data.year
        await fetchMutasi()
    }

    // ================================================================
    // COMPUTED LABELS
    // ================================================================
    const currentMonthLabel = computed(() => {
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        return `${names[selectedMonth.value - 1]}-${selectedYear.value.toString().slice(2)}`
    })

    const lastUpdatedLabel = computed(() => {
        if (!meta.value?.last_updated) return null
        return new Date(meta.value.last_updated).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    })

    const strengthUnit = computed(() => meta.value?.strength_unit ?? 'hours')

    return {
        // State
        jobs, summary, meta, loading, refreshing, error,
        selectedYear, selectedMonth, areaCode, planningV2,
        // Computed
        currentMonthLabel, lastUpdatedLabel, strengthUnit,
        // Upload
        uploading, uploadError,
        // Initial stock
        updatingStock, updateInitialStock, unlockInitialStock,
        // Refresh SSE message
        refreshMessage,
        // Adjust stock
        adjustStock, adjustingStock,
        revertStockAdjust, revertingStock,
        // Recalc planning
        recalcPlanning, recalculating,
        // Shift mode
        setShiftMode, settingShiftMode,
        // Actions
        fetchMutasi, silentFetch, refreshMutasi, refreshAllAreas,
        downloadMutasi, downloadAllAreas, downloadTemplate, uploadMutasi, onPeriodChange,
    }
}
