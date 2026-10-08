// services/Public/Asset/assetQrService.ts
// Registry QR aset (2026-10-05): ID permanen per item (DIE-00012) → label QR yang bisa
// dicetak ulang tanpa berubah. Tahap 1 Dies; berikutnya Jig, Robot, Mesin Press, Mesin Welding.
// Backend: Asset_qr.php + M_asset.php. `detail` publik (halaman scan tanpa login).

import axios from 'axios'

const BASE_URL = 'http://192.168.10.67/majsf_rest_api/api/asset_qr'

/** URL foto dies (file di majsf_rest_api/upload/dies/). */
export const diesImageUrl = (file: string | null | undefined) => (file ? `http://192.168.10.67/majsf_rest_api/upload/dies/${encodeURIComponent(file)}` : '')

/** Link yang di-encode ke QR — selalu alamat produksi supaya label cetakan dari mana pun sama. */
export const assetUrl = (code: string) => `http://192.168.10.67/mims/asset/${encodeURIComponent(code)}`

export type ActivityType = 'PM' | 'REPAIR' | 'SPAREPART'

export const ACTIVITY_LABEL: Record<ActivityType, { label: string; chip: string; icon: string }> = {
  PM:        { label: 'Preventive Maintenance', chip: 'wui-chip--blue',   icon: 'mdi-calendar-check-outline' },
  REPAIR:    { label: 'Repair',                 chip: 'wui-chip--amber',  icon: 'mdi-wrench-outline' },
  SPAREPART: { label: 'Penggantian Spare Part', chip: 'wui-chip--violet', icon: 'mdi-cog-transfer-outline' },
}

export interface DiesForm {
  dies_code?: string
  dies_name: string
  part_number: string
  model: string
  line: string
  tonnage_required: string
  dies_length: string
  dies_width: string
  dies_height: string
  die_no: string
  die_total: string
  avg_pcs_month: string
  material_mpa: string
  pm_interval_month: string
  linked_parts: string   // PN master data, dipisah koma
}

/** Satu baris template Excel tambah dies (lihat utils/diesTemplate.ts). */
export interface DiesImportRow {
  line: string; part_number: string; model: string; die: string; proses: string
  avg_pcs_month: string; material_mpa: string; pm_interval_month: string
  tonnage_required: string; dies_length: string; dies_width: string; dies_height: string
}

export interface DiesAsset {
  id: number
  asset_code: string
  asset_type: 'DIES'
  location: string | null
  is_active: number
  print_count: number
  last_printed_at: string | null
  dies_code: string
  dies_name: string | null
  part_number: string | null
  model: string | null
  line: string | null
  die_no: string | null
  die_total: number | null
  tonnage_required: string | null
  dies_length: string | null
  dies_width: string | null
  dies_height: string | null
  image: string | null
  master_model: string | null   // model dari master data part terhubung (standar); `model` = isi Excel
  pairing_verified_by: string | null
  pairing_verified_at: string | null
  avg_pcs_month: string | null
  material_mpa: string | null
  pm_interval_month: string | null
  last_pm: string | null
  master_part_info: string | null   // job number · nama part dari master (part terhubung pertama)
  n_activity: number
  total_cost: number
  last_activity: string | null
  linked_parts: string | null   // PN master data terhubung, dipisah koma
}

export type PmState = 'ok' | 'soon' | 'overdue' | 'none' | 'unset'
export const PM_STATE: Record<PmState, { label: string; chip: string }> = {
  ok:      { label: 'Aman',           chip: 'wui-chip--green' },
  soon:    { label: 'Segera PM',      chip: 'wui-chip--amber' },
  overdue: { label: 'Lewat jadwal',   chip: 'wui-chip--red' },
  none:    { label: 'Belum ada PM',   chip: '' },
  unset:   { label: 'Frekuensi kosong', chip: '' },
}
const SOON_DAYS = 30
/** Jatuh tempo PM = PM terakhir + interval bulan; "segera" bila ≤ 30 hari lagi. */
export function pmStatus(intervalMonth: string | number | null | undefined, lastPm: string | null | undefined): { state: PmState; due: Date | null; days: number | null } {
  const n = Number(intervalMonth)
  if (!n) return { state: 'unset', due: null, days: null }
  if (!lastPm) return { state: 'none', due: null, days: null }
  const due = new Date(lastPm + 'T00:00:00')
  due.setMonth(due.getMonth() + n)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
  return { state: days < 0 ? 'overdue' : days <= SOON_DAYS ? 'soon' : 'ok', due, days }
}

/** Part master yang terhubung ke dies. */
export interface LinkedPart { part_number: string; part_name: string | null; model: string | null; location: string | null }

/** Dies yang terhubung ke 1 part master data (tab Dies di Master Data). */
export interface PartDies {
  asset_code: string
  is_active: string
  dies_code: string
  dies_name: string | null
  line: string | null
  dies_length: string | null
  dies_width: string | null
  dies_height: string | null
  die_no: string | null
  die_total: string | null
}

export interface AssetActivity {
  id: number
  activity_type: ActivityType
  activity_date: string
  description: string
  spare_part: string | null
  qty: string | null
  cost: string | null
  pic: string | null
  created_by: string | null
  created_at: string
}

export interface AssetDetail {
  id: number
  asset_code: string
  asset_type: string
  location: string | null
  is_active: number
  item?: { dies_code: string; dies_name: string | null; part_number: string | null; model: string | null; line: string | null; die_no: string | null; die_total: number | null; tonnage_required: string | null; dies_length: string | null; dies_width: string | null; dies_height: string | null; image: string | null; master_model: string | null; pairing_verified_by: string | null; pairing_verified_at: string | null; avg_pcs_month: string | null; material_mpa: string | null; pm_interval_month: string | null }
  machines?: string[]
  parts?: LinkedPart[]
  activities: AssetActivity[]
  can_see_cost: boolean   // false = tamu (belum login): cost aktivitas dikirim null
}

export interface ActivityForm {
  activity_type: ActivityType
  activity_date: string
  description: string
  spare_part: string
  qty: string
  cost: string
  pic: string
}

type Res = { success: boolean; message: string }

const assetQrService = {
  async detail(code: string): Promise<AssetDetail> {
    const res = await axios.get(`${BASE_URL}/detail`, { params: { code } })
    // MySQL mengirim angka sebagai teks ("0" = truthy di JS) → normalisasi.
    return { ...res.data.data, id: Number(res.data.data.id), is_active: Number(res.data.data.is_active) }
  },
  async listDies(): Promise<DiesAsset[]> {
    const res = await axios.get(`${BASE_URL}/list_dies`)
    return (res.data.data ?? []).map((a: DiesAsset) => ({
      ...a,
      id: Number(a.id),
      is_active: Number(a.is_active),
      print_count: Number(a.print_count),
      n_activity: Number(a.n_activity),
      total_cost: Number(a.total_cost),
    }))
  },
  async diesByPart(partNumber: string): Promise<PartDies[]> {
    const res = await axios.get(`${BASE_URL}/dies_by_part`, { params: { part: partNumber } })
    return res.data.data ?? []
  },
  async groupParts(partNumber: string): Promise<LinkedPart[]> {
    const res = await axios.get(`${BASE_URL}/group_parts`, { params: { part_number: partNumber } })
    return res.data.data ?? []
  },
  async verifyPairing(partNumber: string, verified: boolean): Promise<Res> {
    return (await axios.post(`${BASE_URL}/verify_pairing`, { part_number: partNumber, verified: verified ? 1 : 0 })).data
  },
  async storeDies(data: DiesForm): Promise<Res & { asset_code?: string }> {
    return (await axios.post(`${BASE_URL}/dies_store`, data)).data
  },
  async updateDies(id: number, data: DiesForm): Promise<Res> {
    return (await axios.post(`${BASE_URL}/dies_update?id=${id}`, data)).data
  },
  async uploadImage(id: number, file: File): Promise<Res & { image?: string }> {
    const fd = new FormData()
    fd.append('image', file)
    return (await axios.post(`${BASE_URL}/upload_image?id=${id}`, fd)).data
  },
  async deleteDies(id: number): Promise<Res> {
    return (await axios.post(`${BASE_URL}/delete?id=${id}`, {})).data
  },
  async importDies(rows: DiesImportRow[]): Promise<Res & { inserted?: number; updated?: number; skipped?: number; errors?: string[] }> {
    return (await axios.post(`${BASE_URL}/dies_import`, { rows })).data
  },
  async toggleActive(id: number): Promise<Res & { is_active?: number }> {
    return (await axios.post(`${BASE_URL}/toggle_active?id=${id}`, {})).data
  },
  async markPrinted(ids: number[]): Promise<void> {
    await axios.post(`${BASE_URL}/mark_printed`, { ids })
  },
  async addActivity(assetCode: string, data: ActivityForm): Promise<Res> {
    return (await axios.post(`${BASE_URL}/activity_add`, { asset_code: assetCode, ...data })).data
  },
}

export default assetQrService
