// services/Public/Welding/auditLogService.ts
// CMS "Log Perubahan" — baca planning_audit (live/arsip), kebijakan arsip (planning_config
// kategori `audit`), jalankan arsip manual, export CSV. Backend: Welding_audit.php + M_audit_log.php.

import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/welding_audit'

export type AuditSource = 'live' | 'archive'

export interface AuditRow {
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
  ip_address: string | null
  note: string | null
}

export interface AuditListParams {
  source?: AuditSource
  module?: string
  action_type?: string
  changed_by?: string
  table_affected?: string
  record_id?: string
  date_from?: string
  date_to?: string
  q?: string
  page?: number
  per_page?: number
}

export interface AuditFacet { v: string; n: number }
export interface AuditStats {
  live:    { rows: number; oldest: string | null; newest: string | null; mb: number }
  archive: { rows: number; oldest: string | null; newest: string | null; mb: number }
  monthly: { ym: string; n: number }[]
  pending: AuditArchivePreview
}
export interface AuditPolicy {
  retention_days_default: number
  retention_days_master: number
  archive_purge_days: number
  archive_auto: number
  master_modules: string[]
}
export interface AuditArchivePreview {
  to_archive: number
  per_module: { module: string; n: number }[]
  to_purge: number
  policy: AuditPolicy
}
export interface AuditConfigRow {
  config_key: string
  config_value: string
  data_type: string
  label: string
  description: string | null
  unit: string | null
  min_value: string | null
  max_value: string | null
  updated_by: string | null
  updated_at: string | null
}

const clean = (p: object) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''))

const auditLogService = {
  async list(params: AuditListParams): Promise<{ data: AuditRow[]; total: number; page: number; per_page: number; last_page: number }> {
    const res = await axios.get(`${BASE_URL}/list`, { params: clean(params) })
    return res.data
  },
  async facets(source: AuditSource = 'live'): Promise<Record<'module' | 'action_type' | 'changed_by', AuditFacet[]>> {
    const res = await axios.get(`${BASE_URL}/facets`, { params: { source } })
    return res.data.data
  },
  async stats(): Promise<AuditStats> {
    const res = await axios.get(`${BASE_URL}/stats`)
    return res.data.data
  },
  async policy(): Promise<{ rows: AuditConfigRow[]; master_modules: string[] }> {
    const res = await axios.get(`${BASE_URL}/policy`)
    return { rows: res.data.data ?? [], master_modules: res.data.master_modules ?? [] }
  },
  async savePolicy(values: Record<string, number>): Promise<{ status: string; message: string }> {
    const res = await axios.post(`${BASE_URL}/policy`, values)
    return res.data
  },
  async archivePreview(): Promise<AuditArchivePreview> {
    const res = await axios.get(`${BASE_URL}/archive_preview`)
    return res.data.data
  },
  async archiveRun(): Promise<{ status: string; message: string; moved: number; purged: number; elapsed_ms: number }> {
    const res = await axios.post(`${BASE_URL}/archive_run`, {}, { timeout: 620000 })
    return res.data
  },
  /** Download CSV (navigasi browser — token via query, sama pola downloadData di masterService). */
  exportCsv(params: AuditListParams): void {
    const token = useAuthStore().token
    const qs = new URLSearchParams(clean({ ...params, token }) as Record<string, string>).toString()
    const a = document.createElement('a')
    a.href = `${BASE_URL}/export?${qs}`
    a.target = '_blank'; a.rel = 'noopener'
    document.body.appendChild(a); a.click(); a.remove()
  },
}

export default auditLogService
