// types/ifpwStock.ts

export interface IfpwStockItem {
    id: number
    part_number: string
    job_number: string
    part_desc: string | null
    lotsize: number | null
    stock: number
    min: number | null
    max: number | null
    created_at: string
    updated_at: string
    // computed di frontend
    status: 'NORMAL' | 'LOW' | 'CRITICAL' | 'OVERSTOCK'
    pct: number
}

export interface IfpwStockSummary {
    total_parts: number
    total_stock: number
    critical_count: number
    low_count: number
    normal_count: number
    overstock_count: number
    last_updated: string | null
}

export interface IfpwStockResponse {
    status: 'success' | 'error'
    data: IfpwStockItem[]
    summary: IfpwStockSummary
    meta: { total: number; page: number; per_page: number; pages: number }
}

export interface IfpwStockFilters {
    part_number?: string
    status_filter?: string
    page?: number
    per_page?: number
}

export function computeStockStatus(
    stock: number,
    min: number | null,
    max: number | null
): 'NORMAL' | 'LOW' | 'CRITICAL' | 'OVERSTOCK' {
    if (max !== null && stock >= max) return 'OVERSTOCK'
    if (min !== null && stock <= min) return 'CRITICAL'
    if (min !== null && stock <= min * 1.5) return 'LOW'
    return 'NORMAL'
}

export function computeStockPct(stock: number, max: number | null): number {
    if (!max || max <= 0) return 0
    return Math.min(Math.round((stock / max) * 100), 100)
}

export const STOCK_STATUS_CONFIG = {
    CRITICAL: { label: 'Kritis', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', bar: 'bg-red-500', ring: 'ring-red-400' },
    LOW: { label: 'Rendah', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', bar: 'bg-orange-400', ring: 'ring-orange-400' },
    NORMAL: { label: 'Normal', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', bar: 'bg-green-500', ring: 'ring-green-400' },
    OVERSTOCK: { label: 'Overstock', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', bar: 'bg-blue-400', ring: 'ring-blue-400' },
}