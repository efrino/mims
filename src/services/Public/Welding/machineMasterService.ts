// services/Public/Welding/machineMasterService.ts
// Aturan #8 — CRUD master identitas mesin welding (area+machine unik) + TPT cap.
// Sumber kebenaran grouping mesin utk Utilisasi Mesin, Kompetisi Mesin, dan
// dropdown "Mesin" di Buffer Mesin OFF.

import axios from 'axios'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/welding_machine_master'

// Hierarki (2026-09-15): process → area → line_group → machine_no. Kode `machine`
// ("A1", "RSW11") tetap kunci yg dipakai engine/routing — hierarki cuma label di atasnya.
export type MachineProcess = 'PRESS' | 'WELDING' | 'OTHER'

export interface WeldingMachineRow {
  id: number
  area_code: string
  process: MachineProcess | null
  machine: string
  line_group: string | null
  machine_no: string | null
  sort_order: number
  machine_name: string | null
  tpt_cap_day_hours: number
  tpt_cap_night_hours: number
  is_active: number
  note: string | null
  created_by: string | null
  created_at: string | null
  updated_by: string | null
  updated_at: string | null
}

export interface WeldingMachineForm {
  area_code: string
  machine: string
  process?: MachineProcess | null
  line_group?: string | null
  machine_no?: string | null
  sort_order?: number
  machine_name?: string | null
  tpt_cap_day_hours?: number
  tpt_cap_night_hours?: number
  note?: string | null
}

export interface MachineTreeGroup { group: string; machines: WeldingMachineRow[] }
export interface MachineTreeArea { area: string; groups: MachineTreeGroup[] }
export interface MachineTreeProcess { process: MachineProcess; areas: MachineTreeArea[] }

const machineMasterService = {
  async list(area?: string, is_active?: string): Promise<{ status: string; data: WeldingMachineRow[] }> {
    const res = await axios.get(`${BASE_URL}/list`, { params: { area, is_active } })
    return res.data
  },

  async store(data: WeldingMachineForm, created_by = 'SYSTEM'): Promise<{ status: string; message?: string; id?: number }> {
    const res = await axios.post(`${BASE_URL}/store`, { ...data, created_by })
    return res.data
  },

  async update(id: number, data: Partial<WeldingMachineForm>, updated_by = 'SYSTEM'): Promise<{ status: string; message?: string }> {
    const res = await axios.post(`${BASE_URL}/update?id=${id}`, { ...data, updated_by })
    return res.data
  },

  async toggleActive(id: number, updated_by = 'SYSTEM'): Promise<{ status: string; message?: string }> {
    const res = await axios.post(`${BASE_URL}/toggle_active?id=${id}`, { updated_by })
    return res.data
  },

  async seed(): Promise<{ status: string; inserted: number; skipped: number; total_candidates: number }> {
    const res = await axios.post(`${BASE_URL}/seed`, {})
    return res.data
  },

  /** Hierarki lengkap process → area → grup → mesin (is_active=1 → aktif saja). */
  async tree(activeOnly = false): Promise<{ status: string; data: MachineTreeProcess[] }> {
    const res = await axios.get(`${BASE_URL}/tree`, { params: activeOnly ? { is_active: 1 } : {} })
    return res.data
  },
  /** Isi line_group/machine_no otomatis dari pola kode & denah PRESS (hanya yg masih kosong, force=1 timpa semua). */
  async deriveGroups(force = false): Promise<{ status: string; updated: number }> {
    const res = await axios.post(`${BASE_URL}/derive_groups${force ? '?force=1' : ''}`, {})
    return res.data
  },
  /** Ganti kode mesin + rambat ke part/routing/denah; kalau kode baru sudah ada di area itu → dilebur (merge). */
  async rename(id: number, machine: string): Promise<{ status: string; message?: string; result?: { merged: boolean; old: string; new: string; cascade: Record<string, number> } }> {
    const res = await axios.post(`${BASE_URL}/rename?id=${id}`, { machine })
    return res.data
  },
}

export default machineMasterService
