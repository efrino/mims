// composables/useMutationData.ts

import { ref, computed, watch } from 'vue'
import type { Job } from '@/types/Public/Welding/planning'
import { tagKind, tagKinds } from '@/utils/mutasiKind'
import { useWeldingAreas } from '@/composables/useWeldingAreas'
import mutasiService, {
    type MutasiSummary,
    type MutasiMeta,
} from '@/services/Public/Welding/mutasiService'

export function useMutationData(initialAreaCode: string = 'SA ADM') {
    const jobs = ref<Job[]>([])
    const summary = ref<MutasiSummary | null>(null)
    const meta = ref<MutasiMeta | null>(null)
    const loading = ref(false)
    const refreshing = ref(false)
    const error = ref<string | null>(null)

    const selectedYear = ref(new Date().getFullYear())
    const selectedMonth = ref(new Date().getMonth() + 1)
    const areaCode = ref(initialAreaCode)

    // areaCode bisa kode area MASTER (mis. SA ADM = ROBOT BARAT+TIMUR+SA MANUAL).
    // Endpoint BACA meng-expand di backend; endpoint TULIS per part butuh zone asli
    // → ambil dari job.areaCode. Pipeline refresh jalan per zone.
    const { zonesOf } = useWeldingAreas()
    const zoneOf = (part_number: string): string =>
        jobs.value.find(j => j.partNo === part_number)?.areaCode || areaCode.value
    const isMergedArea = computed(() => zonesOf(areaCode.value).length > 1)

    // ================================================================
    // FETCH DATA
    // ================================================================
    // Token anti-race: pindah area/periode saat fetch lama masih jalan —
    // respons lama (area besar, lambat) tak boleh menimpa respons baru.
    let fetchSeq = 0

    const fetchMutasi = async () => {
        const seq = ++fetchSeq
        loading.value = true
        error.value = null

        try {
            const res = await mutasiService.getMutasi(
                selectedYear.value,
                selectedMonth.value,
                areaCode.value,
            )
            if (seq !== fetchSeq) return
            if (!res.success) throw new Error(res.message ?? 'Gagal mengambil data')

            jobs.value = tagKinds(res.data, 'FP')
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
            const res = await mutasiService.getMutasi(
                selectedYear.value,
                selectedMonth.value,
                areaCode.value,
            )
            if (seq !== fetchSeq || !res.success) return
            jobs.value    = tagKinds(res.data, 'FP')
            summary.value = res.summary ?? null
            meta.value    = res.meta    ?? null
        } catch { /* silent */ }
    }

    // ================================================================
    // REFRESH — SSE stream via M_formula_engine pipeline (16 steps)
    // refreshMessage cycling per step, auto-clear 2.5s setelah selesai
    // ================================================================
    const refreshMessage = ref<string | null>(null)

    // Daftar zone welding aktif (untuk "Refresh semua area") — dari master Area & Mesin,
    // selaras dropdown Header.vue.
    const { zones: WELDING_AREAS, load: loadWeldingAreas } = useWeldingAreas()

    // Jalankan pipeline SSE untuk SATU area. TIDAK memuat jobs ke view — hanya
    // menjalankan pipeline + update refreshMessage. Resolve {success, done?}.
    const _runRefreshStream = (
        area: string,
        prefix = '',
    ): Promise<{ success: boolean; done?: any; message: string }> => {
        return new Promise((resolve) => {
            refreshMessage.value = `${prefix}Menghubungkan ke pipeline...`
            const url = mutasiService.getRefreshStreamUrl(
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

    // Refresh AREA AKTIF (default).
    const refreshMutasi = async (): Promise<{ success: boolean; message: string }> => {
        refreshing.value = true
        error.value = null
        try {
            // Pipeline per zone; area master gabungan → berurutan.
            const zones = zonesOf(areaCode.value)
            let r: { success: boolean; done?: any; message: string } = { success: true, message: '' }
            for (let i = 0; i < zones.length; i++) {
                r = await _runRefreshStream(zones[i], zones.length > 1 ? `[${i + 1}/${zones.length}] ${zones[i]} — ` : '')
                if (!r.success) { error.value = r.message; refreshMessage.value = null; return { success: false, message: r.message } }
            }

            refreshMessage.value = 'Memuat data hasil pipeline...'
            const res = await mutasiService.getMutasi(selectedYear.value, selectedMonth.value, areaCode.value)
            if (!res.success) throw new Error(res.message ?? 'Gagal mengambil data')
            jobs.value = tagKinds(res.data, 'FP'); summary.value = res.summary ?? null; meta.value = res.meta ?? null

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

    // Refresh SEMUA area (sekuensial). Setiap area selesai, bila itu area aktif langsung reload data.
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
                    // Area aktif baru saja selesai — langsung tampilkan tanpa menunggu sisa area.
                    refreshMessage.value = `[${i + 1}/${total}] Memuat data ${area}...`
                    try {
                        const res = await mutasiService.getMutasi(selectedYear.value, selectedMonth.value, areaCode.value)
                        if (res.success) {
                            jobs.value = tagKinds(res.data, 'FP')
                            summary.value = res.summary ?? null
                            meta.value = res.meta ?? null
                            activeAreaLoaded = true
                        }
                    } catch { /* non-fatal, akan di-retry di akhir */ }
                }
            }
            // Bila area aktif belum ter-load (mis. urutan area aktif belum lewat), muat sekarang.
            if (!activeAreaLoaded) {
                refreshMessage.value = 'Memuat data area aktif...'
                const res = await mutasiService.getMutasi(selectedYear.value, selectedMonth.value, areaCode.value)
                if (res.success) { jobs.value = tagKinds(res.data, 'FP'); summary.value = res.summary ?? null; meta.value = res.meta ?? null }
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
    // DOWNLOAD EXCEL — backend stream langsung, frontend trigger URL
    // ================================================================
    // Buka URL download di TAB BARU → browser yang menangani stream (file berat),
    // SPA tidak ter-blokir. Tab kosong auto-close saat file (attachment) turun.
    const _openTab = (url: string) => {
        window.open(url, '_blank', 'noopener')
    }

    const downloadMutasi = () => {
        _openTab(mutasiService.getDownloadUrl(
            selectedYear.value,
            selectedMonth.value,
            areaCode.value,
        ))
    }

    // Download SEMUA area dalam 1 file (1 sheet per area) — tab baru.
    const downloadAllAreas = () => {
        _openTab(mutasiService.getDownloadAllUrl(
            selectedYear.value,
            selectedMonth.value,
        ))
    }

    // ================================================================
    // DOWNLOAD TEMPLATE — sama tapi endpoint /template
    // ================================================================
    const downloadTemplate = () => {
        _openTab(mutasiService.getTemplateUrl(
            selectedYear.value,
            selectedMonth.value,
            areaCode.value,
        ))
    }

    // ================================================================
    // UPLOAD MUTASI — kirim file template yang sudah diisi
    // ================================================================
    const uploading = ref(false)
    const uploadError = ref<string | null>(null)

    const uploadMutasi = async (file: File) => {
        uploading.value = true
        uploadError.value = null
        try {
            const res = await mutasiService.uploadMutasi(
                selectedYear.value,
                selectedMonth.value,
                areaCode.value,
                file,
            )
            if (!res.success) throw new Error((res as any).message ?? 'Upload gagal')
            jobs.value    = tagKinds(res.data, 'FP')
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
    // UPDATE INITIAL STOCK — update satu part + re-run rolling-nya
    // ================================================================
    const updatingStock = ref(false)

    const updateInitialStock = async (part_number: string, initial_stock: number) => {
        updatingStock.value = true
        try {
            const res = await mutasiService.updateInitialStock(
                selectedYear.value,
                selectedMonth.value,
                zoneOf(part_number),
                part_number,
                initial_stock,
            )
            if (!res.success) throw new Error(res.message ?? 'Gagal update initial stock')

            // Ganti job terkait di array lokal dengan data terbaru dari server
            if (res.data) {
                const idx = jobs.value.findIndex(j => j.partNo === part_number)
                if (idx !== -1) jobs.value[idx] = tagKind(res.data, 'FP')
            }

            return { success: true, data: res.data }
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan'
            return { success: false, message: msg }
        } finally {
            updatingStock.value = false
        }
    }

    // ================================================================
    // RESET / UNLOCK INITIAL STOCK — kembalikan ke stok penutupan bulan lalu + re-run rolling
    // ================================================================
    const unlockInitialStock = async (part_number: string) => {
        updatingStock.value = true
        try {
            const res = await mutasiService.resetInitialStock(
                selectedYear.value,
                selectedMonth.value,
                zoneOf(part_number),
                part_number,
            )
            if (!res.success) throw new Error(res.message ?? 'Gagal reset initial stock')

            if (res.data) {
                const idx = jobs.value.findIndex(j => j.partNo === part_number)
                if (idx !== -1) jobs.value[idx] = tagKind(res.data, 'FP')
            }

            return { success: true, data: res.data, meta: res.meta }
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan'
            return { success: false, message: msg }
        } finally {
            updatingStock.value = false
        }
    }

    // ================================================================
    // ADJUST ACTUAL STOCK + PROPAGASI DELTA ROLLING
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
            const res = await mutasiService.adjustStock(
                selectedYear.value,
                selectedMonth.value,
                zoneOf(params.part_number),
                params.part_number,
                params.tanggal,
                params.shift,
                params.new_stock,
                params.note,
            )
            if (!res.success) throw new Error(res.message ?? 'Adjust stok gagal')

            if (res.data) {
                const idx = jobs.value.findIndex(j => j.partNo === params.part_number)
                if (idx !== -1) jobs.value[idx] = tagKind(res.data, 'FP')
            }

            return { success: true, message: res.message ?? 'Stok diperbarui dan rolling dihitung ulang' }
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan saat adjust stok'
            return { success: false, message: msg }
        } finally {
            adjustingStock.value = false
        }
    }

    // ================================================================
    // REVERT / UNDO KOREKSI STOK (Aturan #19)
    // Backend hapus flag lalu recalc_plan + reapply koreksi lain, balas 1 area
    // penuh (plan part lain bisa ikut bergeser) — ganti seluruh jobs.
    // ================================================================
    const revertingStock = ref(false)

    const revertStockAdjust = async (params: {
        part_number: string
        tanggal: number
        shift: 'day' | 'night'
    }) => {
        revertingStock.value = true
        try {
            const res = await mutasiService.revertStockAdjust(
                selectedYear.value,
                selectedMonth.value,
                zoneOf(params.part_number),
                params.part_number,
                params.tanggal,
                params.shift,
            )
            if (!res.success) throw new Error(res.message ?? 'Revert koreksi stok gagal')
            // Respons = jobs 1 zone saja → utk area gabungan muat ulang semua zone.
            if (isMergedArea.value) await silentFetch()
            else if (Array.isArray(res.data)) {
                jobs.value    = tagKinds(res.data, 'FP')
                summary.value = res.summary ?? summary.value
                meta.value    = res.meta ?? meta.value
            }
            return { success: true, message: res.message ?? 'Koreksi stok dibatalkan, rolling dihitung ulang' }
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Terjadi kesalahan saat revert koreksi stok'
            return { success: false, message: msg }
        } finally {
            revertingStock.value = false
        }
    }

    // ================================================================
    // RECALC PLANNING — hitung ulang plan ke depan + rolling (tanpa full refresh)
    // Dipanggil setelah adjustment; mengganti seluruh jobs area dgn hasil terbaru.
    // ================================================================
    const recalculating = ref(false)
    // Toggle engine planning v2 (2-baris). Persist ke localStorage.
    const planningV2 = ref(localStorage.getItem('welding_planning_v2') === '1')
    watch(planningV2, (v) => localStorage.setItem('welding_planning_v2', v ? '1' : '0'))

    // ── SET SHIFT MODE part (Aturan #5) — both / day / night ───────────────
    const settingShiftMode = ref(false)
    const setShiftMode = async (
        part_number: string,
        mode: 'both' | 'day' | 'night',
        scope: 'month' | 'date' = 'month',
        tanggal?: number,
    ) => {
        settingShiftMode.value = true
        try {
            const res = await mutasiService.setShiftMode(
                selectedYear.value, selectedMonth.value, zoneOf(part_number),
                part_number, mode, scope, tanggal, planningV2.value,
            )
            if (res.success && isMergedArea.value) await silentFetch()
            else if (res.success && Array.isArray(res.data)) {
                jobs.value    = tagKinds(res.data, 'FP')
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
            // Per zone (backend recalc 1 area_code); area gabungan → berurutan lalu muat ulang.
            const zones = zonesOf(areaCode.value)
            let last: any = null
            for (const z of zones) {
                last = await mutasiService.recalcPlan(selectedYear.value, selectedMonth.value, z, planningV2.value)
                if (!last?.success) return { success: false, message: last?.message }
            }
            if (zones.length > 1) await silentFetch()
            else if (last?.success && Array.isArray(last.data)) {
                jobs.value    = tagKinds(last.data, 'FP')
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
    // PERIOD CHANGE dari Header
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

    // ── Keterangan satuan strength dari meta ──────────────────────
    const strengthUnit = computed(() => meta.value?.strength_unit ?? 'hours')

    // ================================================================
    // DISPLAY HELPERS — dipakai TableBody via getCellClass/getDescClass
    // Catatan: TableBody sudah punya logika warna sendiri,
    //          helper ini untuk backward compat jika ada komponen lain
    // ================================================================
    const getDescClass = (type: string): string => {
        const map: Record<string, string> = {
            FORECAST: 'desc-forecast',
            DELIVERY: 'desc-delivery',
            PLAN: 'desc-plan',
            ACTUAL: 'desc-actual',
            BALANCE: 'desc-balance',
            STOCK: 'desc-stock',
            STRENGTH: 'desc-strength',
            PCS_PER_DAY: 'desc-pcs-per-day',
        }
        return map[type] ?? ''
    }

    const getCellClass = (type: string, value: any, qty_kbn: number): string => {
        if (value === null || value === undefined) return ''
        const v = Number(value)
        if (isNaN(v) || v === 0) return ''

        if (type === 'ACTUAL') {
            if (v >= qty_kbn) return 'achievement-100'
            if (v >= qty_kbn * 0.7) return 'achievement-70'
            return 'achievement-low'
        }

        if (type === 'BALANCE' || type === 'STOCK') {
            if (v < 0) return 'cell-negative'
        }

        if (type === 'STRENGTH') {
            if (v >= 2) return 'strength-safe'
            if (v >= 1) return 'strength-warn'
            return 'strength-danger'
        }

        return ''
    }

    return {
        // State
        jobs,
        summary,
        meta,
        loading,
        refreshing,
        error,
        selectedYear,
        selectedMonth,
        areaCode,
        zoneOf,
        zonesOf,
        isMergedArea,
        planningV2,

        // Computed
        currentMonthLabel,
        lastUpdatedLabel,
        strengthUnit,

        // Upload
        uploading,
        uploadError,

        // Update initial stock
        updatingStock,
        updateInitialStock,
        unlockInitialStock,

        // Refresh SSE message
        refreshMessage,

        // Adjust stock
        adjustStock,
        adjustingStock,
        revertStockAdjust,
        revertingStock,

        // Recalc planning (setelah adjustment)
        recalcPlanning,
        recalculating,

        // Shift mode (Aturan #5)
        setShiftMode,
        settingShiftMode,

        // Actions
        fetchMutasi,
        silentFetch,
        refreshMutasi,
        refreshAllAreas,
        downloadMutasi,
        downloadAllAreas,
        downloadTemplate,
        uploadMutasi,
        onPeriodChange,

        // Helpers
        getDescClass,
        getCellClass,
    }
}