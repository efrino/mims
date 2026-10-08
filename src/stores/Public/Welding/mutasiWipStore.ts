// stores/Public/Welding/mutasiWipStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  WipMutasiFilter, WipAlertFilter,
  WipMutasiRow, WipMutasiSummaryRow, WipDailyDetailResponse,
  WipStock, WipStockSummary, WipAlert, PipelineResult,
} from '@/types/Public/Welding/mutasi-wip'
import {
  fetchMutasiWip, fetchMutasiSummary, fetchDailyDetail,
  fetchWipStock, fetchStockSummary,
  fetchWipAlerts, fetchAvailableAreas,
  runWipPipeline, updateSafetyStock,
} from '@/services/Public/Welding/mutasiWipService'

export const useWipMutasiStore = defineStore('wipMutasi', () => {

  // ── Filter ────────────────────────────────────────────────
  const filter = ref<WipMutasiFilter>({
    year:  new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    area:  null,
  })
  const alertFilter = ref<WipAlertFilter>({
    year:    new Date().getFullYear(),
    month:   new Date().getMonth() + 1,
    tanggal: null,
  })

  // ── Summary ───────────────────────────────────────────────
  const summaryRows    = ref<WipMutasiSummaryRow[]>([])
  const loadingSummary = ref(false)
  const errorSummary   = ref<string | null>(null)

  // ── Mutasi harian ─────────────────────────────────────────
  const mutasiRows    = ref<WipMutasiRow[]>([])
  const loadingMutasi = ref(false)
  const errorMutasi   = ref<string | null>(null)

  // ── View mode ─────────────────────────────────────────────
  const mutasiViewMode  = ref<'summary' | 'detail'>('summary')
  const drillDownPart   = ref<{ part_number: string; area: string } | null>(null)
  const drillDownDays   = ref<WipDailyDetailResponse['days']>([])
  const loadingDrillDown = ref(false)

  // ── Stock ─────────────────────────────────────────────────
  const stockRows    = ref<WipStock[]>([])
  const stockSummary = ref<WipStockSummary[]>([])
  const loadingStock = ref(false)
  const errorStock   = ref<string | null>(null)

  // ── Alerts ────────────────────────────────────────────────
  const alertRows     = ref<WipAlert[]>([])
  const totalAlerts   = ref(0)
  const loadingAlerts = ref(false)
  const errorAlerts   = ref<string | null>(null)

  // ── Areas ─────────────────────────────────────────────────
  const availableAreas = ref<string[]>([])

  // ── Pipeline ──────────────────────────────────────────────
  const pipelineRunning = ref(false)
  const pipelineResult  = ref<PipelineResult[] | null>(null)
  const pipelineError   = ref<string | null>(null)
  const pipelineElapsed = ref<number | null>(null)

  // ── UI ────────────────────────────────────────────────────
  const searchQuery = ref('')
  const activeTab   = ref<'mutasi' | 'stock' | 'alerts'>('mutasi')

  // ── Computed ──────────────────────────────────────────────
  const filteredSummaryRows = computed(() => {
    if (!searchQuery.value) return summaryRows.value
    const q = searchQuery.value.toLowerCase()
    return summaryRows.value.filter(r =>
      r.part_number.toLowerCase().includes(q) ||
      r.parent_part.toLowerCase().includes(q) ||
      (r.part_name ?? '').toLowerCase().includes(q)
    )
  })

  const filteredMutasiRows = computed(() => {
    if (!searchQuery.value) return mutasiRows.value
    const q = searchQuery.value.toLowerCase()
    return mutasiRows.value.filter(r =>
      r.part_number.toLowerCase().includes(q) ||
      r.parent_part.toLowerCase().includes(q) ||
      (r.part_name ?? '').toLowerCase().includes(q)
    )
  })

  const totalShortageCount = computed(() =>
    summaryRows.value.filter(r => r.has_shortage).length
  )

  const criticalStockCount = computed(() =>
    stockRows.value.filter(r =>
      r.stock_status === 'CRITICAL' || r.stock_status === 'LOW'
    ).length
  )

  const overviewStats = computed(() => ({
    total_wip_parts:  summaryRows.value.length,
    shortage_parts:   totalShortageCount.value,
    over_stock_parts: summaryRows.value.filter(r => r.has_over).length,
    critical_stock:   criticalStockCount.value,
    total_alerts:     totalAlerts.value,
  }))

  // ── Actions ───────────────────────────────────────────────
  async function loadSummary() {
    loadingSummary.value = true
    errorSummary.value   = null
    try {
      const res = await fetchMutasiSummary(filter.value)
      summaryRows.value = res.rows
    } catch (e: any) {
      errorSummary.value = e.message ?? 'Gagal memuat summary'
      console.error('[loadSummary]', e)
    } finally {
      loadingSummary.value = false
    }
  }

  async function loadMutasi() {
    loadingMutasi.value = true
    errorMutasi.value   = null
    try {
      const res = await fetchMutasiWip(filter.value)
      mutasiRows.value = res.rows
    } catch (e: any) {
      errorMutasi.value = e.message ?? 'Gagal memuat mutasi harian'
      console.error('[loadMutasi]', e)
    } finally {
      loadingMutasi.value = false
    }
  }

  async function openDrillDown(part_number: string, area: string) {
    drillDownPart.value    = { part_number, area }
    drillDownDays.value    = []
    loadingDrillDown.value = true
    mutasiViewMode.value   = 'detail'
    try {
      const res = await fetchDailyDetail(
        filter.value.year, filter.value.month, part_number, area
      )
      drillDownDays.value = res.days
    } catch (e: any) {
      console.error('[openDrillDown]', e)
    } finally {
      loadingDrillDown.value = false
    }
  }

  function closeDrillDown() {
    drillDownPart.value  = null
    drillDownDays.value  = []
    mutasiViewMode.value = 'summary'
  }

  async function loadStock() {
    loadingStock.value = true
    errorStock.value   = null
    try {
      const [stockRes, summaryRes] = await Promise.all([
        fetchWipStock(filter.value.area),
        fetchStockSummary(),
      ])
      stockRows.value    = stockRes.rows
      stockSummary.value = summaryRes
    } catch (e: any) {
      errorStock.value = e.message ?? 'Gagal memuat stok'
      console.error('[loadStock]', e)
    } finally {
      loadingStock.value = false
    }
  }

  async function saveSafetyStock(part_number: string, area: string, safety_stock: number) {
    await updateSafetyStock(part_number, area, safety_stock)
    await loadStock()
  }

  async function loadAlerts() {
    loadingAlerts.value = true
    errorAlerts.value   = null
    try {
      const res = await fetchWipAlerts(alertFilter.value)
      alertRows.value   = res.rows
      totalAlerts.value = res.total
    } catch (e: any) {
      errorAlerts.value = e.message ?? 'Gagal memuat alerts'
      console.error('[loadAlerts]', e)
    } finally {
      loadingAlerts.value = false
    }
  }

  async function loadAreas() {
    try {
      availableAreas.value = await fetchAvailableAreas(
        filter.value.year, filter.value.month
      )
    } catch (e) {
      availableAreas.value = []
    }
  }

  async function runPipeline() {
    pipelineRunning.value = true
    pipelineError.value   = null
    pipelineResult.value  = null
    pipelineElapsed.value = null
    try {
      const res = await runWipPipeline(
        filter.value.year, filter.value.month, filter.value.area
      )
      pipelineResult.value  = res.summary
      pipelineElapsed.value = res.elapsed_ms
      await loadAll()
    } catch (e: any) {
      pipelineError.value = e.message ?? 'Pipeline gagal'
      throw e
    } finally {
      pipelineRunning.value = false
    }
  }

  function setFilter(f: Partial<WipMutasiFilter>) {
    filter.value = { ...filter.value, ...f }
    alertFilter.value = {
      ...alertFilter.value,
      year:  filter.value.year,
      month: filter.value.month,
    }
  }

  async function loadAll() {
    await Promise.all([
      loadSummary(),
      loadMutasi(),
      loadStock(),
      loadAlerts(),
      loadAreas(),
    ])
  }

  return {
    filter, alertFilter,
    summaryRows, loadingSummary, errorSummary,
    mutasiRows,  loadingMutasi,  errorMutasi,
    mutasiViewMode, drillDownPart, drillDownDays, loadingDrillDown,
    stockRows, stockSummary, loadingStock, errorStock,
    alertRows, totalAlerts, loadingAlerts, errorAlerts,
    availableAreas,
    pipelineRunning, pipelineResult, pipelineError, pipelineElapsed,
    searchQuery, activeTab,
    filteredSummaryRows, filteredMutasiRows,
    totalShortageCount, criticalStockCount, overviewStats,
    loadAll, loadSummary, loadMutasi, loadStock, loadAlerts, loadAreas,
    saveSafetyStock, runPipeline, setFilter,
    openDrillDown, closeDrillDown,
  }
})