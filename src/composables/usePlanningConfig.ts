// composables/usePlanningConfig.ts  v2
// Diselaraskan: pipeline per bulan (year + month + area)

import { ref, computed } from 'vue'
import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfigItem {
  id: number
  config_key: string
  config_value: string
  data_type: 'integer' | 'decimal' | 'formula' | 'json' | 'string'
  category: string
  label: string
  description: string | null
  unit: string | null
  min_value: number | null
  max_value: number | null
  is_active: number
  updated_by: string | null
  updated_at: string
}

// Aturan DN per customer (ms_dn_rule_customer). Field null/'' = ikut aturan global.
export interface DnCustomerRule {
  id?: number
  customer_name: string
  dn_mode: 'shift' | 'day_only' | null
  day_start: string | null
  day_end: string | null
  early_morning: 'prev_night' | 'same_night' | null
  note: string | null
  is_active: number
  updated_by?: string | null
  updated_at?: string | null
}

export interface ConfigGroup {
  category: string
  meta: { icon: string; title: string }
  configs: ConfigItem[]
}

export interface AuditLog {
  id: number
  action_type: string
  module: string
  table_affected: string
  record_id: string | null
  field_name: string | null
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_at: string
  note: string | null
}

export interface PipelineStep {
  step: number | string
  label: string
  rows: number
  status: 'OK' | 'SKIP' | 'ERROR'
  params?: Record<string, any>
  error?: string
}

export interface PipelineResult {
  success: boolean
  elapsed_ms?: number
  steps: PipelineStep[]
  message?: string
  params?: {
    year: number
    month: number
    area: string
    spmon: string
    days: number
  }
}

export interface AnomalyLog {
  id: number
  period_year: number
  period_month: number
  area_code: string
  part_number: string
  tanggal: number
  anomaly_type: 'DN_SPIKE' | 'DN_DROP' | 'MDFO_MISMATCH' | 'PLAN_MISS_STREAK'
  value_current: number
  value_avg: number
  value_stddev: number
  sigma_score: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'NEW' | 'REVIEWED' | 'DISMISSED'
  detected_at: string
}

export interface Alert {
  id: number
  alert_date: string
  period_year: number
  period_month: number
  area_code: string
  part_number: string
  tanggal: number | null
  alert_type: string
  alert_level: 'CRITICAL' | 'WARNING' | 'INFO'
  message: string | null
  stock_hours: number | null  // jam sisa stok (bukan hari)
}

export interface StockRow {
  part_number: string
  area_code: string
  part_name: string
  pcs_per_day: number | null
  uph: number | null          // unit per hour (alternatif strength)
  stock_status: 'KRITIS' | 'WASPADA' | 'NORMAL'
  priority_rank: number
  coverage_hours: number | null  // jam sisa stok (bukan hari)
  dn_anomaly_flag: string | null
  miss_pattern_level: string | null
  stock_ifpd: number
  stock_rolling: number
  stock_diff: number
  miss_pattern_pct: number | null
}

export interface DashboardData {
  stock_summary: {
    deficit: number; critical: number
    safe: number;    over: number;   total: number
  }
  plan_summary: {
    parts_aktif: number; areas_count: number
    total_dn:    number; total_plan:  number
    total_actual: number; cutoff_day: number
  }
  alert_summary: { CRITICAL: number; WARNING: number; INFO: number; total: number }
  last_config_changes: AuditLog[]
  last_pipeline_run: AuditLog | null
  period: { year: number; month: number; area: string | null }
  as_of: string
}

// ─── Step 1 Master Data ───────────────────────────────────────────────────────

export interface MsWeldingRow {
  part_number: string
  area_code:   string
  job_no:      string
  part_name:   string
  model:       string
  qty_kbn:     number
  status_part: string
  is_wip:      number
  stock_ifpd:  number
}

export interface MdfoRow {
  matnr:     string
  spmon:     string
  part_name: string | null
  area_code: string | null
  t1:  number; t2:  number; t3:  number; t4:  number; t5:  number
  t6:  number; t7:  number; t8:  number; t9:  number; t10: number
  t11: number; t12: number; t13: number; t14: number; t15: number
  t16: number; t17: number; t18: number; t19: number; t20: number
  t21: number; t22: number; t23: number; t24: number; t25: number
  t26: number; t27: number; t28: number; t29: number; t30: number
  t31: number
}

export interface IFPDStockRow {
  part_number: string
  part_name:   string | null
  area_code:   string | null
  stock_qty:   number
}

export interface MachineOffRow {
  id:          number
  area_code:   string
  machine:     string | null
  part_number: string | null
  off_date:    string          // 'YYYY-MM-DD'
  shift:       'day' | 'night' | 'both'
  reason:      string | null
  is_active:   number
  created_by:  string | null
  created_at:  string | null
}

export interface MachineRow {
  area_code:  string
  machine:    string
  line_group?: string | null   // hierarki mesin (Grup → No), lihat MachineMasterManager
  machine_no?: string | null
  part_count: number
}

// ─── Pipeline params ──────────────────────────────────────────────────────────

export interface PipelineParams {
  year: number
  month: number
  area?: string | null
  force?: boolean
}

// ─── Composable ───────────────────────────────────────────────────────────────

const BASE = 'http://192.168.10.67/majsf_rest_api/api/planning-cms'

export function usePlanningConfig() {
  // Config state
  const configGroups  = ref<ConfigGroup[]>([])
  const editBuffer    = ref<Record<string, string>>({})

  // Audit
  const auditLogs  = ref<AuditLog[]>([])
  const auditMeta  = ref({ total: 0, per_page: 20, page: 1, pages: 0 })

  // Pipeline
  const pipelineResult = ref<PipelineResult | null>(null)

  // Step 1 master data
  const msWeldingList  = ref<MsWeldingRow[]>([])
  const ifpdStockList  = ref<IFPDStockRow[]>([])
  // Step 2 MDFO
  const mdfoList       = ref<MdfoRow[]>([])
  // Buffer / Mesin-OFF
  const machineOffList = ref<MachineOffRow[]>([])
  const machineList    = ref<MachineRow[]>([])
  const machineOffTableReady = ref<boolean>(true)

  // Data
  const stockList    = ref<StockRow[]>([])
  const anomalyLogs  = ref<AnomalyLog[]>([])
  const anomalyMeta  = ref({ total: 0, page: 1, pages: 0 })
  const alerts       = ref<Alert[]>([])
  const alertSummary = ref({ CRITICAL: 0, WARNING: 0, INFO: 0 })
  const dashboard    = ref<DashboardData | null>(null)

  // Status
  const loading  = ref(false)
  const saving   = ref(false)
  const running  = ref(false)
  const error    = ref<string | null>(null)
  const saveMsg  = ref<string | null>(null)

  // Dirty detection
  const isDirty = computed(() => {
    for (const g of configGroups.value) {
      for (const c of g.configs) {
        if (editBuffer.value[c.config_key] !== undefined &&
            editBuffer.value[c.config_key] !== c.config_value) {
          return true
        }
      }
    }
    return false
  })

  // ── CONFIG ────────────────────────────────────────────────────────────────

  async function fetchConfig() {
    loading.value = true; error.value = null
    try {
      const { data } = await axios.get(`${BASE}/config`)
      configGroups.value = data.data
      editBuffer.value   = {}
      for (const g of data.data as ConfigGroup[]) {
        for (const c of g.configs) {
          editBuffer.value[c.config_key] = c.config_value
        }
      }
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Gagal memuat konfigurasi.'
    } finally {
      loading.value = false
    }
  }

  async function saveOne(key: string, value: string) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.put(`${BASE}/config`, { key, value })
      saveMsg.value = data.message
      _syncValue(key, value)
      return true
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Gagal menyimpan.'
      return false
    } finally {
      saving.value = false
    }
  }

  // ── Aturan DN per customer ─────────────────────────────────────
  async function fetchDnCustomerRules(): Promise<{ rules: DnCustomerRule[]; customers: string[] }> {
    const { data } = await axios.get(`${BASE}/dn_rule_customer`)
    return data.data
  }
  async function saveDnCustomerRule(rule: DnCustomerRule): Promise<{ success: boolean; message?: string }> {
    const { data } = await axios.post(`${BASE}/dn_rule_customer`, rule)
    return data
  }
  async function deleteDnCustomerRule(id: number): Promise<{ success: boolean; message?: string }> {
    const { data } = await axios.delete(`${BASE}/dn_rule_customer`, { params: { id } })
    return data
  }

  async function saveAll() {
    saving.value = true; error.value = null; saveMsg.value = null

    const changed: Record<string, string> = {}
    for (const g of configGroups.value) {
      for (const c of g.configs) {
        const v = editBuffer.value[c.config_key]
        if (v !== undefined && v !== c.config_value) changed[c.config_key] = v
      }
    }
    if (!Object.keys(changed).length) {
      saveMsg.value = 'Tidak ada perubahan.'
      saving.value  = false
      return true
    }
    try {
      const { data } = await axios.put(`${BASE}/config`, { batch: changed })
      saveMsg.value = `${Object.keys(changed).length} parameter disimpan.`
      for (const [k, v] of Object.entries(changed)) {
        if (data.results?.[k]?.success !== false) _syncValue(k, v)
      }
      return data.success
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Gagal batch save.'
      return false
    } finally {
      saving.value = false
    }
  }

  function discardChanges() {
    for (const g of configGroups.value) {
      for (const c of g.configs) editBuffer.value[c.config_key] = c.config_value
    }
  }

  // ── AUDIT ─────────────────────────────────────────────────────────────────

  async function fetchAuditLog(filters: Record<string, any> = {}, silent = false) {
    if (!silent) loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/audit-log`, { params: { per_page: 20, ...filters } })
      auditLogs.value = data.data
      auditMeta.value = data.meta
    } catch (e: any) {
      if (!silent) error.value = e.response?.data?.message ?? 'Gagal memuat audit log.'
    } finally {
      if (!silent) loading.value = false
    }
  }

  // ── PIPELINE ──────────────────────────────────────────────────────────────

  async function runStep(params: { year: number; month: number; step_id: string; area?: string | null }) {
    pipelineResult.value = null; running.value = true; error.value = null
    try {
      const { data } = await axios.post(`${BASE}/run-step`, {
        year:    params.year,
        month:   params.month,
        step_id: params.step_id,
        area:    params.area ?? null,
      })
      pipelineResult.value = {
        success:    data.success,
        elapsed_ms: data.elapsed_ms,
        steps:      data.step ? [data.step] : [],
        message:    data.message,
      }
      if (!data.success && data.message) error.value = data.message
      return data
    } catch (e: any) {
      const respData = e.response?.data
      if (respData?.step) {
        pipelineResult.value = {
          success:    false,
          elapsed_ms: respData.elapsed_ms,
          steps:      [respData.step],
          message:    respData.step?.error ?? respData.message,
        }
      }
      const msg = respData?.step?.error ?? respData?.message ?? 'Step gagal dijalankan.'
      error.value = msg
      return respData ?? { success: false, message: msg }
    } finally {
      running.value = false
    }
  }

  /**
   * Jalankan 16-step pipeline via SSE streaming.
   * Setiap step langsung muncul di UI tanpa menunggu semua selesai.
   */
  async function runPipeline(params: PipelineParams) {
    running.value = true
    error.value   = null

    // Buat skeleton result agar step-list langsung muncul
    pipelineResult.value = {
      success:    false,
      elapsed_ms: 0,
      steps:      [],
      params: {
        year:  params.year,
        month: params.month,
        area:  params.area ?? 'ALL',
        spmon: `${params.year}${String(params.month).padStart(2, '0')}`,
        days:  0,
      },
    }

    try {
      const resp = await fetch(`${BASE}/run-pipeline-stream`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          year:  params.year,
          month: params.month,
          area:  params.area ?? null,
          force: params.force ?? false,
        }),
      })

      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`)

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        let evt = '', dat = ''
        for (const line of lines) {
          if (line.startsWith('event: '))     evt = line.slice(7).trim()
          else if (line.startsWith('data: ')) dat = line.slice(6).trim()
          else if (line === '' && dat) {
            try {
              const payload = JSON.parse(dat)
              if (evt === 'step' && pipelineResult.value) {
                pipelineResult.value.steps.push(payload.step_result)
              } else if (evt === 'done') {
                pipelineResult.value = payload as PipelineResult
              } else if (evt === 'error') {
                error.value = payload.message ?? 'Pipeline error'
              }
            } catch { /* abaikan JSON parse error */ }
            evt = ''; dat = ''
          }
        }
      }

      if (pipelineResult.value && !pipelineResult.value.success && pipelineResult.value.message) {
        error.value = pipelineResult.value.message
      }
      return pipelineResult.value

    } catch (e: any) {
      const msg = e.message ?? 'Pipeline gagal dijalankan.'
      error.value = msg
      if (pipelineResult.value) pipelineResult.value.success = false
      return pipelineResult.value ?? { success: false, message: msg, steps: [] } as PipelineResult
    } finally {
      running.value = false
    }
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────────

  async function previewStrength(params: Record<string, string | number>) {
    try {
      const { data } = await axios.get(`${BASE}/preview-formula`, { params: { type: 'strength', ...params } })
      return data.data
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Preview gagal.'; return null }
  }

  async function previewPcsDay(part_number: string, params: Record<string, string | number>) {
    try {
      const { data } = await axios.get(`${BASE}/preview-formula`, { params: { type: 'pcs_day', part_number, ...params } })
      return data.data
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Preview gagal.'; return null }
  }

  // ── STOCK COMPARISON ──────────────────────────────────────────────────────

  async function fetchStockComparison(year: number, month: number, area?: string, limit = 50) {
    loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/stock-comparison`, { params: { year, month, area, limit } })
      stockList.value = data.data
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat stok.' }
    finally { loading.value = false }
  }

  // ── ANOMALY LOG ───────────────────────────────────────────────────────────

  async function fetchAnomalyLog(params: Record<string, any> = {}) {
    loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/anomaly-log`, { params })
      anomalyLogs.value = data.data
      anomalyMeta.value = data.meta
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat anomaly log.' }
    finally { loading.value = false }
  }

  // ── ALERTS ────────────────────────────────────────────────────────────────

  async function fetchAlerts(year: number, month: number, area?: string, level?: string) {
    loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/alerts`, { params: { year, month, area, alert_level: level } })
      alerts.value       = data.data
      alertSummary.value = data.summary
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat alert.' }
    finally { loading.value = false }
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────

  async function fetchDashboard(year: number, month: number, area?: string) {
    loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/dashboard-summary`, { params: { year, month, area } })
      dashboard.value = data.data
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat dashboard.' }
    finally { loading.value = false }
  }

  // ── MS_WELDING CRUD ───────────────────────────────────────────────────────

  async function fetchMsWelding(params: { area?: string; q?: string; limit?: number } = {}) {
    loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/ms-welding`, { params })
      msWeldingList.value = data.data
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat ms_welding.' }
    finally { loading.value = false }
  }

  async function addMsWelding(row: Omit<MsWeldingRow, 'status_part' | 'is_wip' | 'stock_ifpd'>) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.post(`${BASE}/ms-welding`, row)
      saveMsg.value = data.message
      return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal menambah part.'; return false }
    finally { saving.value = false }
  }

  async function updateMsWelding(row: Partial<MsWeldingRow> & { part_number: string; area_code: string }) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.put(`${BASE}/ms-welding`, row)
      saveMsg.value = data.message
      return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal update part.'; return false }
    finally { saving.value = false }
  }

  async function deleteMsWelding(part_number: string, area_code: string, hard = false) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.delete(`${BASE}/ms-welding`, { data: { part_number, area_code, hard_delete: hard } })
      saveMsg.value = data.message
      return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal hapus part.'; return false }
    finally { saving.value = false }
  }

  // ── MDFO CRUD ─────────────────────────────────────────────────────────────

  async function fetchMdfo(params: { year: number; month: number; area?: string; q?: string; limit?: number }) {
    loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/mdfo`, { params })
      mdfoList.value = data.data
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat MDFO.' }
    finally { loading.value = false }
  }

  async function addMdfo(row: { matnr: string; year: number; month: number } & Partial<MdfoRow>) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.post(`${BASE}/mdfo`, row)
      saveMsg.value = data.message; return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal tambah MDFO.'; return false }
    finally { saving.value = false }
  }

  async function updateMdfo(row: { matnr: string; year: number; month: number } & Partial<MdfoRow>) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.put(`${BASE}/mdfo`, row)
      saveMsg.value = data.message; return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal update MDFO.'; return false }
    finally { saving.value = false }
  }

  async function deleteMdfo(matnr: string, year: number, month: number) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.delete(`${BASE}/mdfo`, { data: { matnr, year, month } })
      saveMsg.value = data.message; return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal hapus MDFO.'; return false }
    finally { saving.value = false }
  }

  // ── MACHINE-OFF (Buffer) CRUD ───────────────────────────────────────────────

  async function fetchMachineOff(params: { year: number; month: number; area?: string }) {
    loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/machine-off`, { params })
      machineOffList.value      = data.data ?? []
      machineOffTableReady.value = data.table_ready !== false
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat data Mesin-OFF.' }
    finally { loading.value = false }
  }

  async function fetchMachines(area?: string) {
    try {
      const { data } = await axios.get(`${BASE}/machines`, { params: area ? { area } : {} })
      machineList.value = data.data ?? []
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat daftar mesin.' }
  }

  async function addMachineOff(row: {
    area_code: string; machine?: string | null; part_number?: string | null
    off_date_start: string; off_date_end?: string; shift?: string; reason?: string | null
  }) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.post(`${BASE}/machine-off`, row)
      saveMsg.value = data.message; return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal tambah Mesin-OFF.'; return false }
    finally { saving.value = false }
  }

  async function updateMachineOff(row: { id: number } & Partial<MachineOffRow>) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.put(`${BASE}/machine-off`, row)
      saveMsg.value = data.message; return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal update Mesin-OFF.'; return false }
    finally { saving.value = false }
  }

  async function deleteMachineOff(id: number) {
    saving.value = true; error.value = null; saveMsg.value = null
    try {
      const { data } = await axios.delete(`${BASE}/machine-off`, { data: { id } })
      saveMsg.value = data.message; return true
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal hapus Mesin-OFF.'; return false }
    finally { saving.value = false }
  }

  // ── IFPD STOCK ────────────────────────────────────────────────────────────

  async function fetchIFPDStock(params: { q?: string; area?: string; limit?: number } = {}) {
    loading.value = true
    try {
      const { data } = await axios.get(`${BASE}/ifpd-stock`, { params })
      ifpdStockList.value = data.data
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Gagal memuat stok IFPD.' }
    finally { loading.value = false }
  }

  // ── INTERNAL ─────────────────────────────────────────────────────────────

  function _syncValue(key: string, value: string) {
    for (const g of configGroups.value) {
      const c = g.configs.find(x => x.config_key === key)
      if (c) { c.config_value = value; editBuffer.value[key] = value; break }
    }
  }

  function clearMessages() { error.value = null; saveMsg.value = null }

  return {
    // State
    configGroups, editBuffer, auditLogs, auditMeta,
    pipelineResult, stockList, anomalyLogs, anomalyMeta,
    alerts, alertSummary, dashboard,
    msWeldingList, ifpdStockList, mdfoList,
    machineOffList, machineList, machineOffTableReady,
    loading, saving, running, error, saveMsg, isDirty,

    // Methods
    fetchConfig, saveOne, saveAll, discardChanges,
    fetchDnCustomerRules, saveDnCustomerRule, deleteDnCustomerRule,
    fetchAuditLog,
    runPipeline, runStep,
    previewStrength, previewPcsDay,
    fetchStockComparison,
    fetchAnomalyLog,
    fetchAlerts,
    fetchDashboard,
    fetchMsWelding, addMsWelding, updateMsWelding, deleteMsWelding,
    fetchIFPDStock,
    fetchMdfo, addMdfo, updateMdfo, deleteMdfo,
    fetchMachineOff, fetchMachines, addMachineOff, updateMachineOff, deleteMachineOff,
    clearMessages,
  }
}
