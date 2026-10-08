// services/Public/Stamping/stampingAreaService.ts
// Master AREA stamping (2026-10-05) — klon weldingAreaService. 1 area = 1 line press inhouse (A–H, SP);
// mesin = ms_welding_machine (process PRESS, area_code = source_area, line_group),
// sumber tunggal mesin press. Spec press + slot dies ikut per mesin.
// Backend: Stamping_area.php + M_stamping_area.php.

import axios from 'axios'
import type { AreaMachine, LayoutRow } from '@/services/Public/Welding/weldingAreaService'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/stamping_area'

export type StampingAreaType = 'LINE' | 'SP'

export interface StampingArea {
  id: number
  area_code: string
  area_name: string | null
  area_type: StampingAreaType
  source_area: string
  line_group: string
  sort_order: number
  is_active: number
  layout_w: number
  layout_h: number
  layout_json: string | null
  machine_total: number
  machine_active: number
  updated_by: string | null
  updated_at: string | null
}

export interface StampingDies { pairing_id: number; id: number; code: string; name: string | null; part_number: string | null }

export interface StampingSpec { press_type: string | null; tonnage: string | null; stroke: string | null; die_size: string | null }

export type StampingMachine = AreaMachine & StampingSpec & { dies: StampingDies[] }

type Ok = { status: string; message?: string }

const stampingAreaService = {
  async list(activeOnly = false): Promise<StampingArea[]> {
    const res = await axios.get(`${BASE_URL}/list`, { params: activeOnly ? { is_active: 1 } : {} })
    return (res.data.data ?? []).map((a: StampingArea) => ({
      ...a,
      id: Number(a.id),
      sort_order: Number(a.sort_order),
      is_active: Number(a.is_active),
      layout_w: Number(a.layout_w) || 1200,
      layout_h: Number(a.layout_h) || 640,
      layout_json: a.layout_json ?? null,
      machine_total: Number(a.machine_total),
      machine_active: Number(a.machine_active),
    }))
  },
  async update(id: number, data: { area_name?: string; layout_w?: number; layout_h?: number; layout_json?: string }): Promise<Ok> {
    const res = await axios.post(`${BASE_URL}/update?id=${id}`, data)
    return res.data
  },
  async toggleActive(id: number): Promise<Ok & { is_active?: number }> {
    const res = await axios.post(`${BASE_URL}/toggle_active?id=${id}`, {})
    return res.data
  },
  async machines(areaCode: string): Promise<StampingMachine[]> {
    const res = await axios.get(`${BASE_URL}/machines`, { params: { area_code: areaCode } })
    return (res.data.machines ?? []).map((m: StampingMachine) => ({
      ...m,
      id: Number(m.id),
      is_active: Number(m.is_active),
      sort_order: Number(m.sort_order),
      pos_x: m.pos_x === null ? null : Number(m.pos_x),
      pos_y: m.pos_y === null ? null : Number(m.pos_y),
      part_count: Number(m.part_count),
      dies: m.dies ?? [],
    }))
  },
  async saveLayout(rows: LayoutRow[]): Promise<Ok & { updated?: number }> {
    const res = await axios.post(`${BASE_URL}/layout`, { rows })
    return res.data
  },
  async saveSpec(id: number, spec: Partial<StampingSpec>): Promise<Ok> {
    const res = await axios.post(`${BASE_URL}/spec?id=${id}`, spec)
    return res.data
  },
  async addDies(machineId: number, diesCode: string): Promise<{ success: boolean; message: string }> {
    const res = await axios.post(`${BASE_URL}/dies_add`, { machine_id: machineId, dies_code: diesCode })
    return res.data
  },
  async removeDies(pairingId: number): Promise<{ success: boolean; message: string }> {
    const res = await axios.post(`${BASE_URL}/dies_remove?id=${pairingId}`, {})
    return res.data
  },
}

export default stampingAreaService
