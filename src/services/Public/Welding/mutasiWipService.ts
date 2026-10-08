// services/Public/Welding/mutasiWipService.ts
import axios from 'axios'
import type {
    WipMutasiFilter,
    WipMutasiResponse,
    WipMutasiSummaryResponse,
    WipDailyDetailResponse,
    WipStockResponse,
    WipStockSummary,
    WipAlertFilter,
    WipAlertResponse,
    PipelineResponse,
} from '@/types/Public/Welding/mutasi-wip'

const BASE = 'http://192.168.10.67/majsf_rest_api/api/wip_mutasi'

// Controller pakai BD_Controller yang return { success, ... }
// bukan { status: 'success', data: ... }
// Semua endpoint return format: { success: true, rows: [...], total: N, ... }

export async function fetchMutasiSummary(f: WipMutasiFilter): Promise<WipMutasiSummaryResponse> {
    const { data } = await axios.get(`${BASE}/summary`, {
        params: { year: f.year, month: f.month, area: f.area ?? undefined },
    })
    if (!data.success) throw new Error(data.message ?? 'Gagal fetch summary')
    return { period: data.period, area: data.area, total: data.total, rows: data.rows }
}

export async function fetchMutasiWip(f: WipMutasiFilter): Promise<WipMutasiResponse> {
    const { data } = await axios.get(`${BASE}/mutasi`, {
        params: { year: f.year, month: f.month, area: f.area ?? undefined },
    })
    if (!data.success) throw new Error(data.message ?? 'Gagal fetch mutasi')
    return { period: data.period, area: data.area, total: data.total, rows: data.rows }
}

export async function fetchDailyDetail(
    year: number, month: number, part_number: string, area: string
): Promise<WipDailyDetailResponse> {
    const { data } = await axios.get(`${BASE}/daily`, {
        params: { year, month, part_number, area },
    })
    if (!data.success) throw new Error(data.message ?? 'Gagal fetch daily')
    return { period: data.period, part_number: data.part_number, area: data.area, days: data.days }
}

export async function fetchWipStock(area?: string | null): Promise<WipStockResponse> {
    const { data } = await axios.get(`${BASE}/stock`, {
        params: { area: area ?? undefined },
    })
    if (!data.success) throw new Error(data.message ?? 'Gagal fetch stock')
    return { rows: data.rows, total: data.total }
}

export async function fetchStockSummary(): Promise<WipStockSummary[]> {
    const { data } = await axios.get(`${BASE}/stock_summary`)
    if (!data.success) throw new Error(data.message ?? 'Gagal fetch stock summary')
    return data.rows
}

export async function fetchWipAlerts(f: WipAlertFilter): Promise<WipAlertResponse> {
    const { data } = await axios.get(`${BASE}/alerts`, {
        params: { year: f.year, month: f.month, tanggal: f.tanggal ?? undefined },
    })
    if (!data.success) throw new Error(data.message ?? 'Gagal fetch alerts')
    return { period: data.period, tanggal: data.tanggal, total: data.total, rows: data.rows }
}

export async function fetchAvailableAreas(year: number, month: number): Promise<string[]> {
    const { data } = await axios.get(`${BASE}/areas`, { params: { year, month } })
    if (!data.success) throw new Error(data.message ?? 'Gagal fetch areas')
    return data.areas
}

export async function runWipPipeline(
    year: number, month: number, area?: string | null
): Promise<PipelineResponse> {
    const { data } = await axios.post(`${BASE}/run_pipeline`, {
        year, month, area: area ?? null,
    })
    if (!data.success) throw new Error(data.message ?? 'Pipeline gagal')
    return {
        period: data.period,
        area: data.area,
        elapsed_ms: data.elapsed_ms,
        summary: data.summary,
    }
}

export async function updateSafetyStock(
    part_number: string, area: string, safety_stock: number
): Promise<void> {
    const { data } = await axios.put(`${BASE}/safety_stock`, {
        part_number, area, safety_stock,
    })
    if (!data.success) throw new Error(data.message ?? 'Gagal update safety stock')
}