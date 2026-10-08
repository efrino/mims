// stores/stockQueueStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { QueueItem, QueueSummaryItem, QueueListFilters, QueueListMeta, QueueDetail, ProcessMode, ReconcileRow, ReconcileMeta, NoMovementRow, NoMovementMeta, AuditMasterRow, AuditMasterMeta } from '@/types/Public/Welding/stockQueue'
import { fetchQueueStatus, fetchQueueList, fetchQueueDetail, retryFailed, manualProcess, purgeDone, fetchAutoMode, setAutoMode, fetchReconciliation, fetchNoMovement, fetchAuditMaster, fetchMasterStatus, uploadMasterFile } from '@/services/Public/Welding/stockQueueService'

export const useStockQueueStore = defineStore('stockQueue', () => {
    const summary = ref<QueueSummaryItem[]>([])
    const pendingAlert = ref(false)
    const failedAlert = ref(false)
    const checkedAt = ref<string | null>(null)
    const items = ref<QueueItem[]>([])
    const meta = ref<QueueListMeta>({ total: 0, page: 1, per_page: 50, pages: 1 })
    const filters = ref<QueueListFilters>({ page: 1, per_page: 50 })
    const selectedDetail = ref<QueueDetail | null>(null)
    const autoMode = ref<ProcessMode>('ALL')
    const savingAutoMode = ref(false)
    const initialized = ref(false)
    const refreshing = ref(false)
    const loadingStatus = ref(false)
    const loadingList = ref(false)
    const loadingAction = ref(false)
    const loadingDetail = ref(false)
    const errorStatus = ref<string | null>(null)
    const errorList = ref<string | null>(null)
    const actionMessage = ref<string | null>(null)
    const actionSuccess = ref<boolean | null>(null)

    const reconcileRows = ref<ReconcileRow[]>([])
    const reconcileMeta = ref<ReconcileMeta>({ total_parts: 0, total_failed_rows: 0, total_failed_qty: 0 })
    const loadingReconcile = ref(false)
    const errorReconcile = ref<string | null>(null)

    const noMoveRows = ref<NoMovementRow[]>([])
    const noMoveMeta = ref<NoMovementMeta>({ hari: 30, total_part: 0, tanpa_mapping: 0, ada_mapping: 0, total_stok: 0, catatan: '' })
    const loadingNoMove = ref(false)
    const errorNoMove = ref<string | null>(null)

    const auditRows = ref<AuditMasterRow[]>([])
    const auditMeta = ref<AuditMasterMeta>({
        total_diaudit: 0, per_status: {}, dikecualikan: { routing_SINGLE: 0 }, sumber: [], catatan: ''
    })
    const loadingAudit = ref(false)
    const errorAudit = ref<string | null>(null)
    const uploadingMaster = ref(false)

    const summaryMap = computed(() => Object.fromEntries(summary.value.map(s => [s.status, s])))
    const pendingCount = computed(() => summaryMap.value['PENDING']?.cnt ?? 0)
    const processingCount = computed(() => summaryMap.value['PROCESSING']?.cnt ?? 0)
    const doneCount = computed(() => summaryMap.value['DONE']?.cnt ?? 0)
    const failedCount = computed(() => summaryMap.value['FAILED']?.cnt ?? 0)

    async function loadStatus(silent = false) {
        if (!silent) loadingStatus.value = true
        errorStatus.value = null
        try {
            const res = await fetchQueueStatus()
            summary.value = res.data.summary
            pendingAlert.value = res.data.pending_alert
            failedAlert.value = res.data.failed_alert
            checkedAt.value = res.data.checked_at
        } catch (e: any) { errorStatus.value = e.message } finally { loadingStatus.value = false }
    }

    async function loadList(overrideFilters?: QueueListFilters, silent = false) {
        if (overrideFilters) filters.value = { ...filters.value, ...overrideFilters }
        if (!silent) loadingList.value = true
        errorList.value = null
        try {
            const res = await fetchQueueList(filters.value)
            items.value = res.data; meta.value = res.meta
        } catch (e: any) { errorList.value = e.message } finally { loadingList.value = false }
    }

    async function loadAutoMode() {
        try {
            const res = await fetchAutoMode()
            if (res.mode) autoMode.value = res.mode
        } catch (e: any) { console.error(e) }
    }

    // Ubah mode auto-process (dibaca MySQL Event). Manual Process juga ikut mode ini.
    async function updateAutoMode(mode: ProcessMode) {
        const prev = autoMode.value
        autoMode.value = mode // optimistic
        savingAutoMode.value = true; actionMessage.value = null; actionSuccess.value = null
        try {
            const res = await setAutoMode(mode)
            autoMode.value = res.mode ?? mode
            actionSuccess.value = res.status === 'success'
            actionMessage.value = res.message ?? `Mode auto-process: ${autoMode.value}`
        } catch (e: any) {
            autoMode.value = prev // rollback
            actionSuccess.value = false
            actionMessage.value = e.message
        } finally { savingAutoMode.value = false }
    }

    // Initial load — toggles skeleton loaders once.
    async function init() {
        await Promise.all([loadStatus(), loadList(), loadAutoMode()])
        initialized.value = true
    }

    // Background refresh — silent, never blanks the table (no flicker/jump).
    async function refresh() {
        if (refreshing.value) return
        refreshing.value = true
        try {
            await Promise.all([loadStatus(true), loadList(undefined, true)])
        } finally { refreshing.value = false }
    }

    async function loadDetail(id: number) {
        loadingDetail.value = true; selectedDetail.value = null
        try {
            const res = await fetchQueueDetail(id)
            selectedDetail.value = res.data
        } catch (e: any) { console.error(e) } finally { loadingDetail.value = false }
    }

    async function runRetryFailed(ids: number[] = []) {
        loadingAction.value = true; actionMessage.value = null; actionSuccess.value = null
        try {
            const res = await retryFailed({ max_retry: 3, ids: ids.length ? ids : undefined })
            actionSuccess.value = res.status === 'success'
            actionMessage.value = res.message ?? `${res.affected ?? 0} baris direset ke PENDING`
            await Promise.all([loadStatus(), loadList()])
        } catch (e: any) { actionSuccess.value = false; actionMessage.value = e.message }
        finally { loadingAction.value = false }
    }

    async function runManualProcess(mode: ProcessMode = autoMode.value) {
        loadingAction.value = true; actionMessage.value = null; actionSuccess.value = null
        try {
            const res = await manualProcess(mode)
            actionSuccess.value = res.status === 'success'
            actionMessage.value = res.message ?? 'Proses selesai'
            if (res.summary) summary.value = res.summary
            await loadList()
        } catch (e: any) { actionSuccess.value = false; actionMessage.value = e.message }
        finally { loadingAction.value = false }
    }

    async function runPurgeDone(days = 7) {
        loadingAction.value = true; actionMessage.value = null; actionSuccess.value = null
        try {
            const res = await purgeDone(days)
            actionSuccess.value = res.status === 'success'
            actionMessage.value = res.message ?? `${res.affected ?? 0} baris DONE dihapus`
            await Promise.all([loadStatus(), loadList()])
        } catch (e: any) { actionSuccess.value = false; actionMessage.value = e.message }
        finally { loadingAction.value = false }
    }

    async function loadReconciliation() {
        loadingReconcile.value = true
        errorReconcile.value = null
        try {
            const res = await fetchReconciliation()
            reconcileRows.value = res.data
            reconcileMeta.value = res.meta
        } catch (e: any) { errorReconcile.value = e.message } finally { loadingReconcile.value = false }
    }

    async function loadNoMovement(hari = 30) {
        loadingNoMove.value = true
        errorNoMove.value = null
        try {
            const res = await fetchNoMovement(hari)
            noMoveRows.value = res.data
            noMoveMeta.value = res.meta
        } catch (e: any) { errorNoMove.value = e.message } finally { loadingNoMove.value = false }
    }

    async function loadAuditMaster(f: { source?: string; status?: string; hari?: number } = {}) {
        loadingAudit.value = true
        errorAudit.value = null
        try {
            const res = await fetchAuditMaster(f)
            auditRows.value = res.data
            auditMeta.value = res.meta
        } catch (e: any) { errorAudit.value = e.message } finally { loadingAudit.value = false }
    }

    async function loadMasterStatus() {
        try {
            const res = await fetchMasterStatus()
            auditMeta.value = { ...auditMeta.value, sumber: res.data }
        } catch (e: any) { console.error(e) }
    }

    async function importMaster(file: File, source: 'INHOUSE' | 'OUTHOUSE') {
        uploadingMaster.value = true
        actionMessage.value = null; actionSuccess.value = null
        try {
            const res = await uploadMasterFile(file, source)
            const d = res.data
            const dup = Object.keys(d.part_duplikat ?? {}).length
            actionSuccess.value = true
            actionMessage.value = `${d.source_file}: ${d.baris_masuk} baris masuk`
                + (dup ? `, ${dup} part kembar digabung` : '')
            return true
        } catch (e: any) {
            actionSuccess.value = false
            actionMessage.value = e.message
            return false
        } finally { uploadingMaster.value = false }
    }

    function setFilter(key: keyof QueueListFilters, value: any) { filters.value = { ...filters.value, [key]: value, page: 1 } }
    function setPage(page: number) { filters.value = { ...filters.value, page } }
    function clearActionMessage() { actionMessage.value = null; actionSuccess.value = null }
    function closeDetail() { selectedDetail.value = null }

    return {
        summary, pendingAlert, failedAlert, checkedAt,
        items, meta, filters, selectedDetail,
        autoMode, savingAutoMode,
        initialized, refreshing,
        loadingStatus, loadingList, loadingAction, loadingDetail,
        errorStatus, errorList, actionMessage, actionSuccess,
        summaryMap, pendingCount, processingCount, doneCount, failedCount,
        reconcileRows, reconcileMeta, loadingReconcile, errorReconcile,
        noMoveRows, noMoveMeta, loadingNoMove, errorNoMove,
        auditRows, auditMeta, loadingAudit, errorAudit, uploadingMaster,
        loadStatus, loadList, loadDetail, loadAutoMode, updateAutoMode, init, refresh,
        runRetryFailed, runManualProcess, runPurgeDone, loadReconciliation, loadNoMovement, loadAuditMaster, loadMasterStatus, importMaster,
        setFilter, setPage, clearActionMessage, closeDetail,
    }
})