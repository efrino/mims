// ─────────────────────────────────────────────────────────────
// services/stockQueueService.ts
// ─────────────────────────────────────────────────────────────

import type {
    QueueStatusResponse,
    QueueListResponse,
    QueueActionResponse,
    QueueDetailResponse,
    QueueListFilters,
    ProcessMode,
    AutoModeResponse,
    ReconcileResponse,
    NoMovementResponse,
    AuditMasterResponse,
    MasterStatusResponse,
    ImportMasterResponse,
} from '@/types/Public/Welding/stockQueue'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/stock_queue'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}/${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
}

export function fetchQueueStatus(): Promise<QueueStatusResponse> {
    return request<QueueStatusResponse>('status')
}

export function fetchQueueList(filters: QueueListFilters = {}): Promise<QueueListResponse> {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.production_date) params.set('production_date', filters.production_date)
    if (filters.part_number) params.set('part_number', filters.part_number)
    if (filters.shift_code) params.set('shift_code', String(filters.shift_code))
    if (filters.page) params.set('page', String(filters.page))
    if (filters.per_page) params.set('per_page', String(filters.per_page))
    const qs = params.toString()
    return request<QueueListResponse>(`list${qs ? `?${qs}` : ''}`)
}

export function fetchQueueDetail(id: number): Promise<QueueDetailResponse> {
    return request<QueueDetailResponse>(`detail?id=${id}`)
}

export function retryFailed(payload: { max_retry?: number; ids?: number[] }): Promise<QueueActionResponse> {
    return request<QueueActionResponse>('retry_failed', { method: 'POST', body: JSON.stringify(payload) })
}

export function manualProcess(mode: ProcessMode = 'INHOUSE'): Promise<QueueActionResponse> {
    return request<QueueActionResponse>('manual_process', { method: 'POST', body: JSON.stringify({ mode }) })
}

export function purgeDone(days = 7): Promise<QueueActionResponse> {
    return request<QueueActionResponse>('purge_done', { method: 'POST', body: JSON.stringify({ days }) })
}

export function fetchAutoMode(): Promise<AutoModeResponse> {
    return request<AutoModeResponse>('auto_mode')
}

export function setAutoMode(mode: ProcessMode): Promise<AutoModeResponse> {
    return request<AutoModeResponse>('auto_mode', { method: 'POST', body: JSON.stringify({ mode }) })
}

export function fetchReconciliation(): Promise<ReconcileResponse> {
    return request<ReconcileResponse>('reconcile')
}

export function fetchNoMovement(hari = 30): Promise<NoMovementResponse> {
    return request<NoMovementResponse>(`no_movement?hari=${hari}`)
}

// URL unduhan Excel — dipakai langsung oleh <a download>/window.open,
// bukan lewat fetch(), supaya browser yang menangani file-nya.
export function urlExportExcel(): string {
    return `${BASE_URL}/export_excel`
}

export interface AuditMasterFilter {
    source?: string
    category?: string
    routing?: string
    status?: string
    hari?: number
}

export function fetchAuditMaster(f: AuditMasterFilter = {}): Promise<AuditMasterResponse> {
    const q = new URLSearchParams()
    if (f.source) q.set('source', f.source)
    if (f.category) q.set('category', f.category)
    if (f.routing) q.set('routing', f.routing)
    if (f.status) q.set('status', f.status)
    if (f.hari) q.set('hari', String(f.hari))
    const qs = q.toString()
    return request<AuditMasterResponse>(`audit_master${qs ? `?${qs}` : ''}`)
}

export function fetchMasterStatus(): Promise<MasterStatusResponse> {
    return request<MasterStatusResponse>('master_status')
}

// Upload multipart — JANGAN set Content-Type sendiri, biarkan browser yang
// menuliskan boundary-nya. Karena itu tidak lewat request() di atas.
export async function uploadMasterFile(file: File, source: 'INHOUSE' | 'OUTHOUSE'): Promise<ImportMasterResponse> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${BASE_URL}/import_master?source=${source}`, { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({ message: res.statusText }))
    if (!res.ok) throw new Error((json as any).message ?? `HTTP ${res.status}`)
    return json as ImportMasterResponse
}

// URL unduhan Excel hasil audit. Dipakai <a href>, bukan fetch(): browser yang
// menangani file-nya, dan filter yang sedang tampil ikut terbawa apa adanya.
export function urlExportAuditMaster(f: AuditMasterFilter = {}): string {
    const q = new URLSearchParams()
    if (f.source) q.set('source', f.source)
    if (f.category) q.set('category', f.category)
    if (f.routing) q.set('routing', f.routing)
    if (f.status) q.set('status', f.status)
    if (f.hari) q.set('hari', String(f.hari))
    const qs = q.toString()
    return `${BASE_URL}/export_audit_master${qs ? `?${qs}` : ''}`
}
