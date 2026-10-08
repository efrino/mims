// services/ifpwStockService.ts

import type { IfpwStockResponse, IfpwStockFilters } from '@/types/Public/Welding/ifpwStock'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/ifpw_stock'

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

export function fetchIfpwStock(filters: IfpwStockFilters = {}): Promise<IfpwStockResponse> {
    const params = new URLSearchParams()
    if (filters.part_number) params.set('part_number', filters.part_number)
    if (filters.status_filter && filters.status_filter !== 'ALL')
        params.set('status_filter', filters.status_filter)
    if (filters.page) params.set('page', String(filters.page))
    if (filters.per_page) params.set('per_page', String(filters.per_page))
    const qs = params.toString()
    return request<IfpwStockResponse>(`list${qs ? `?${qs}` : ''}`)
}

export interface UpdateStockPayload {
    part_number: string
    stock: number
    min?: number | null
    max?: number | null
}

export interface UpdateStockResponse {
    status: 'success' | 'error'
    message: string
}

export function updateIfpwStock(payload: UpdateStockPayload): Promise<UpdateStockResponse> {
    return request<UpdateStockResponse>('update', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}