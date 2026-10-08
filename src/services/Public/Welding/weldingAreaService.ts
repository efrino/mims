// services/Public/Welding/weldingAreaService.ts
// Master AREA welding (revisi 2026-09-18): WSS/CO/SA × ADM/MMKI/HMMI — saklar
// aktif per area, zone (nilai area lama yg dipayungi, mis. SA ADM = ROBOT BARAT +
// ROBOT TIMUR + SA MANUAL), daftar mesin + koordinat 2D (ms_welding_machine.pos_x/pos_y).
// Backend: Welding_area.php + M_welding_area.php.

import axios from 'axios'
import type { WeldingMachineRow } from './machineMasterService'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/welding_area'

export type AreaPlant = 'ADM' | 'MMKI' | 'HMMI'
export type AreaType = 'WSS' | 'CO' | 'SA'

export interface WeldingAreaZone { id: number; area_code: string; zone: string; sort_order: number }

export interface WeldingArea {
  id: number
  area_code: string
  area_name: string | null
  plant: AreaPlant
  area_type: AreaType
  sort_order: number
  is_active: number
  layout_w: number
  layout_h: number
  layout_json: string | null   // elemen denah (wilayah/jalan/titik) — lihat useFloorPlan
  zones: WeldingAreaZone[]
  machine_total: number
  machine_active: number
  updated_by: string | null
  updated_at: string | null
}

export interface WeldingAreaForm {
  area_code: string
  area_name?: string | null
  plant: AreaPlant
  area_type: AreaType
  sort_order?: number
}

/** Mesin di dalam 1 area (gabungan semua zone) + koordinat denah. */
export interface AreaMachineJig { id: number | null; code: string; parts: string[] }

/** Nomor jig berikutnya (1, 2, 3, ...) = nomor numerik terbesar + 1. */
export const nextJigCode = (jigs: AreaMachineJig[] | undefined): string =>
  String(Math.max(0, ...(jigs ?? []).map(j => parseInt(j.code, 10)).filter(n => !Number.isNaN(n))) + 1)

export interface AreaMachine extends WeldingMachineRow {
  pos_x: number | null
  pos_y: number | null
  part_count: number
  jigs?: AreaMachineJig[]   // hanya area SA (slot jig mesin robot + part pemakainya)
}

export interface UnassignedZone { zone: string; n_machine: number; n_part: number }

export interface LayoutRow { id: number; pos_x: number | null; pos_y: number | null }

type Ok = { status: string; message?: string }

const weldingAreaService = {
  async list(activeOnly = false): Promise<WeldingArea[]> {
    const res = await axios.get(`${BASE_URL}/list`, { params: activeOnly ? { is_active: 1 } : {} })
    return (res.data.data ?? []).map(normalizeArea)
  },
  async store(data: WeldingAreaForm): Promise<Ok & { id?: number }> {
    const res = await axios.post(`${BASE_URL}/store`, data)
    return res.data
  },
  async update(id: number, data: Partial<WeldingAreaForm> & { layout_w?: number; layout_h?: number; layout_json?: string }): Promise<Ok> {
    const res = await axios.post(`${BASE_URL}/update?id=${id}`, data)
    return res.data
  },
  async toggleActive(id: number): Promise<Ok & { is_active?: number }> {
    const res = await axios.post(`${BASE_URL}/toggle_active?id=${id}`, {})
    return res.data
  },
  async setZones(areaCode: string, zones: string[]): Promise<Ok> {
    const res = await axios.post(`${BASE_URL}/zones?area_code=${encodeURIComponent(areaCode)}`, { zones })
    return res.data
  },
  async unassignedZones(): Promise<UnassignedZone[]> {
    const res = await axios.get(`${BASE_URL}/unassigned_zones`)
    return (res.data.data ?? []).map((z: UnassignedZone) => ({ zone: z.zone, n_machine: Number(z.n_machine), n_part: Number(z.n_part) }))
  },
  async machines(areaCode: string): Promise<{ zones: string[]; machines: AreaMachine[] }> {
    const res = await axios.get(`${BASE_URL}/machines`, { params: { area_code: areaCode } })
    const machines = (res.data.machines ?? []).map((m: AreaMachine) => ({
      ...m,
      id: Number(m.id),
      is_active: Number(m.is_active),
      sort_order: Number(m.sort_order),
      pos_x: m.pos_x === null ? null : Number(m.pos_x),
      pos_y: m.pos_y === null ? null : Number(m.pos_y),
      part_count: Number(m.part_count),
    }))
    return { zones: res.data.zones ?? [], machines }
  },
  async saveLayout(rows: LayoutRow[]): Promise<Ok & { updated?: number }> {
    const res = await axios.post(`${BASE_URL}/layout`, { rows })
    return res.data
  },
  async seed(): Promise<Ok & { inserted_area: number; inserted_zone: number }> {
    const res = await axios.post(`${BASE_URL}/seed`, {})
    return res.data
  },
}

function normalizeArea(a: WeldingArea): WeldingArea {
  return {
    ...a,
    id: Number(a.id),
    sort_order: Number(a.sort_order),
    is_active: Number(a.is_active),
    layout_w: Number(a.layout_w) || 1200,
    layout_h: Number(a.layout_h) || 640,
    layout_json: a.layout_json ?? null,
    machine_total: Number(a.machine_total),
    machine_active: Number(a.machine_active),
    zones: (a.zones ?? []).map(z => ({ ...z, id: Number(z.id), sort_order: Number(z.sort_order) })),
  }
}

export default weldingAreaService
